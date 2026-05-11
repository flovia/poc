import {
  QWEN3_4B_INST_Q4_K_M,
  VERBOSITY,
  completion,
  downloadAsset,
  loadModel,
} from "@qvac/sdk";
import {
  type PhaseBCustomerUpsellExplanation,
  type PhaseBCustomerUpsellExplanationInput,
  type PhaseBCustomerUpsellExplanationResponse,
  type PhaseBCustomerUpsellMetricsResponse,
  validatePhaseBCustomerUpsellExplanationResponse,
} from "contracts";
import {
  BffLlmInferenceError,
  BffLlmUnavailableError,
  type BffLlmService,
  DEFAULT_LLM_MAX_TOKENS,
  DEFAULT_LLM_TEMPERATURE,
  GENERIC_LLM_INFERENCE_ERROR_MESSAGE,
  UPSSELL_EXPLANATION_GENERATED_FROM,
  buildUpsellExplanationCacheKey,
  buildUpsellExplanationInput,
  buildUpsellExplanationSystemPrompt,
  buildUpsellExplanationUserPrompt,
  deriveQvacModelId,
  describeErrorCause,
  extractJsonObject,
  llmReason,
  normalizeConfiguredValue,
  readCachedUpsellExplanation,
  resolveDefaultBranchName,
  resolveDefaultCacheDirectory,
  resolveDefaultCacheTtlMs,
  resolveDefaultDeploymentId,
  resolveDefaultPromptVersion,
  resolveDefaultQvacContextSize,
  resolveDefaultQvacDevice,
  resolveDefaultQvacModelSource,
  resolveDefaultRuntimeInstanceId,
  stringifyQvacModelSource,
  type QvacModelSource,
  type QvacSdkClient,
  type ResolveBffLlmServiceOptions,
  type WorkflowIntentLlmRequest,
  type WorkflowIntentLlmResult,
  writeCachedUpsellExplanation,
} from "./llm-shared";

const defaultQvacClient: QvacSdkClient = {
  downloadAsset(options) {
    return downloadAsset(options);
  },
  loadModel(options) {
    return loadModel(options);
  },
  async completeText(input) {
    const result = completion({
      modelId: input.modelId,
      history: input.history,
      stream: true,
      generationParams: {
        temp: input.temperature,
        predict: input.maxTokens,
      },
    });

    return await result.text;
  },
};

type QvacUpsellExplanationServiceOptions = {
  client: QvacSdkClient;
  modelSrc: QvacModelSource;
  modelId: string;
  promptVersion: string;
  device: string;
  contextSize: number;
  branchName: string;
  cacheDirectory: string;
  cacheTtlMs: number;
  deploymentId?: string;
  runtimeInstanceId?: string;
  now: () => number;
};

class QvacUpsellExplanationService implements BffLlmService {
  readonly #client: QvacSdkClient;
  readonly #modelSrc: QvacModelSource;
  readonly #modelId: string;
  readonly #promptVersion: string;
  readonly #device: string;
  readonly #contextSize: number;
  readonly #branchName: string;
  readonly #cacheDirectory: string;
  readonly #cacheTtlMs: number;
  readonly #deploymentId?: string;
  readonly #runtimeInstanceId?: string;
  readonly #now: () => number;
  readonly #inflightByCacheKey = new Map<
    string,
    Promise<PhaseBCustomerUpsellExplanationResponse>
  >();
  #loadedModelIdPromise: Promise<string> | null = null;

  constructor(options: QvacUpsellExplanationServiceOptions) {
    this.#client = options.client;
    this.#modelSrc = options.modelSrc;
    this.#modelId = options.modelId;
    this.#promptVersion = options.promptVersion;
    this.#device = options.device;
    this.#contextSize = options.contextSize;
    this.#branchName = options.branchName;
    this.#cacheDirectory = options.cacheDirectory;
    this.#cacheTtlMs = options.cacheTtlMs;
    this.#deploymentId = options.deploymentId;
    this.#runtimeInstanceId = options.runtimeInstanceId;
    this.#now = options.now;
  }

  async generateUpsellExplanation(
    input: PhaseBCustomerUpsellMetricsResponse,
  ): Promise<PhaseBCustomerUpsellExplanationResponse> {
    const explanationInput = buildUpsellExplanationInput(input);
    const cacheKey = buildUpsellExplanationCacheKey({
      branchName: this.#branchName,
      provider: "qvac",
      modelId: this.#modelId,
      promptVersion: this.#promptVersion,
      modelFingerprint: {
        modelSrc: stringifyQvacModelSource(this.#modelSrc),
        device: this.#device,
        contextSize: this.#contextSize,
      },
      deploymentId: this.#deploymentId,
      runtimeInstanceId: this.#runtimeInstanceId,
      address: input.address,
      sourceGeneratedAt: input.sourceGeneratedAt,
      explanationInput,
    });
    const cached = await readCachedUpsellExplanation(
      this.#cacheDirectory,
      cacheKey,
      this.#now(),
      this.#cacheTtlMs,
    );

    if (cached) {
      return cached;
    }

    const inflight = this.#inflightByCacheKey.get(cacheKey);
    if (inflight) {
      return await inflight;
    }

    const generation = this.#generateAndCacheUpsellExplanation(input, explanationInput, cacheKey);
    this.#inflightByCacheKey.set(cacheKey, generation);

    try {
      return await generation;
    } finally {
      this.#inflightByCacheKey.delete(cacheKey);
    }
  }

  async #ensureLoadedModelId() {
    if (this.#loadedModelIdPromise) {
      return await this.#loadedModelIdPromise;
    }

    const loading = (async () => {
      if (this.#client.downloadAsset) {
        await this.#client.downloadAsset({ assetSrc: this.#modelSrc });
      }
      return await this.#client.loadModel({
        modelSrc: this.#modelSrc,
        modelType: "llm",
        modelConfig: {
          device: this.#device,
          ctx_size: this.#contextSize,
          verbosity: VERBOSITY.ERROR,
        },
      });
    })();
    this.#loadedModelIdPromise = loading;

    try {
      return await loading;
    } catch (error) {
      this.#loadedModelIdPromise = null;
      throw error;
    }
  }

  async #generateAndCacheUpsellExplanation(
    input: PhaseBCustomerUpsellMetricsResponse,
    explanationInput: PhaseBCustomerUpsellExplanationInput,
    cacheKey: string,
  ) {
    const response = await this.#generateUpsellExplanationUncached(input, explanationInput);
    await writeCachedUpsellExplanation(this.#cacheDirectory, cacheKey, response);
    return response;
  }

  async #generateUpsellExplanationUncached(
    input: PhaseBCustomerUpsellMetricsResponse,
    explanationInput: PhaseBCustomerUpsellExplanationInput,
  ): Promise<PhaseBCustomerUpsellExplanationResponse> {
    let explanation: PhaseBCustomerUpsellExplanation;

    try {
      console.log("generating by qvac");
      const runtimeModelId = await this.#ensureLoadedModelId();
      const text = await this.#client.completeText({
        modelId: runtimeModelId,
        history: [
          {
            role: "system",
            content: buildUpsellExplanationSystemPrompt(this.#promptVersion),
          },
          {
            role: "user",
            content: buildUpsellExplanationUserPrompt(
              {
                ...input,
                signals: explanationInput.signals,
                flags: explanationInput.flags,
                reasonCodes: explanationInput.reasonCodes,
                caveats: explanationInput.caveats,
              },
              this.#promptVersion,
            ),
          },
        ],
        temperature: DEFAULT_LLM_TEMPERATURE,
        maxTokens: DEFAULT_LLM_MAX_TOKENS,
      });
      explanation = JSON.parse(extractJsonObject(text)) as PhaseBCustomerUpsellExplanation;
    } catch (error) {
      if (error instanceof BffLlmInferenceError) {
        throw error;
      }

      const causeDetail = describeErrorCause(error);
      throw new BffLlmInferenceError(
        causeDetail
          ? `${GENERIC_LLM_INFERENCE_ERROR_MESSAGE} ${causeDetail}`
          : GENERIC_LLM_INFERENCE_ERROR_MESSAGE,
        {
          cause: error,
        },
      );
    }

    return validatePhaseBCustomerUpsellExplanationResponse({
      generatedAt: new Date(this.#now()).toISOString(),
      generatedFrom: UPSSELL_EXPLANATION_GENERATED_FROM,
      address: input.address,
      sourceGeneratedAt: input.sourceGeneratedAt,
      model: {
        provider: "qvac",
        modelId: this.#modelId,
        promptVersion: this.#promptVersion,
      },
      input: explanationInput,
      explanation,
      provenance: "derived_insight",
      provenanceByField: {
        address: "onchain_fact",
        sourceGeneratedAt: "derived_insight",
        model: "derived_insight",
        input: "derived_insight",
        explanation: "derived_insight",
      },
      reasons: [llmReason],
    });
  }

  async generateWorkflowIntentExplanation(
    _request: WorkflowIntentLlmRequest,
  ): Promise<WorkflowIntentLlmResult> {
    throw new BffLlmUnavailableError("Workflow intent explanation is not available for qvac.");
  }
}

export const resolveQvacBffLlmService = (
  options: ResolveBffLlmServiceOptions,
  allowDefaultModelSource = true,
): BffLlmService | null => {
  const modelSrc =
    options.qvacModelSrc ??
    resolveDefaultQvacModelSource() ??
    (allowDefaultModelSource ? QWEN3_4B_INST_Q4_K_M : undefined);

  if (!modelSrc) {
    return null;
  }

  const modelId =
    options.qvacModelId ??
    options.modelId ??
    normalizeConfiguredValue(process.env.BFF_QVAC_MODEL_ID) ??
    deriveQvacModelId(modelSrc);
  const promptVersion = options.promptVersion ?? resolveDefaultPromptVersion();
  const device = options.qvacDevice ?? resolveDefaultQvacDevice();
  const contextSize = options.qvacContextSize ?? resolveDefaultQvacContextSize();
  const branchName = options.branchName ?? resolveDefaultBranchName();
  const cacheDirectory = options.cacheDirectory ?? resolveDefaultCacheDirectory();
  const cacheTtlMs = options.cacheTtlMs ?? resolveDefaultCacheTtlMs();
  const deploymentId = options.deploymentId ?? resolveDefaultDeploymentId();
  const runtimeInstanceId = options.runtimeInstanceId ?? resolveDefaultRuntimeInstanceId();
  const now = options.now ?? Date.now;
  const client = options.qvacClient ?? defaultQvacClient;

  return new QvacUpsellExplanationService({
    client,
    modelSrc,
    modelId,
    promptVersion,
    device,
    contextSize,
    branchName,
    cacheDirectory,
    cacheTtlMs,
    deploymentId,
    runtimeInstanceId,
    now,
  });
};
