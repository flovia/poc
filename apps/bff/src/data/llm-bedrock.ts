import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  type PhaseBCustomerUpsellExplanation,
  type PhaseBCustomerUpsellExplanationInput,
  type PhaseBCustomerUpsellExplanationResponse,
  type PhaseBCustomerUpsellMetricsResponse,
  validatePhaseBCustomerUpsellExplanationResponse,
} from "contracts";
import {
  BffLlmInferenceError,
  type BffLlmService,
  DEFAULT_LLM_MAX_TOKENS,
  DEFAULT_LLM_TEMPERATURE,
  GENERIC_LLM_INFERENCE_ERROR_MESSAGE,
  UPSSELL_EXPLANATION_GENERATED_FROM,
  buildUpsellExplanationCacheKey,
  buildUpsellExplanationInput,
  buildUpsellExplanationSystemPrompt,
  buildUpsellExplanationUserPrompt,
  describeErrorCause,
  extractJsonObject,
  extractTextFromBedrockResponse,
  llmReason,
  readCachedUpsellExplanation,
  resolveDefaultBranchName,
  resolveDefaultCacheDirectory,
  resolveDefaultCacheTtlMs,
  resolveDefaultDeploymentId,
  resolveDefaultPromptVersion,
  resolveDefaultRuntimeInstanceId,
  type ResolveBffLlmServiceOptions,
  writeCachedUpsellExplanation,
} from "./llm-shared";

type BedrockUpsellExplanationServiceOptions = {
  client: BedrockRuntimeClient;
  modelId: string;
  promptVersion: string;
  region: string;
  branchName: string;
  cacheDirectory: string;
  cacheTtlMs: number;
  deploymentId?: string;
  runtimeInstanceId?: string;
  now: () => number;
};

class BedrockUpsellExplanationService implements BffLlmService {
  readonly #client: BedrockRuntimeClient;
  readonly #modelId: string;
  readonly #promptVersion: string;
  readonly #region: string;
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

  constructor(options: BedrockUpsellExplanationServiceOptions) {
    this.#client = options.client;
    this.#modelId = options.modelId;
    this.#promptVersion = options.promptVersion;
    this.#region = options.region;
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
      provider: "bedrock",
      modelId: this.#modelId,
      promptVersion: this.#promptVersion,
      modelFingerprint: {
        region: this.#region,
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
    const command = new ConverseCommand({
      modelId: this.#modelId,
      system: [
        {
          text: buildUpsellExplanationSystemPrompt(this.#promptVersion),
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              text: buildUpsellExplanationUserPrompt(
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
        },
      ],
      inferenceConfig: {
        maxTokens: DEFAULT_LLM_MAX_TOKENS,
        temperature: DEFAULT_LLM_TEMPERATURE,
      },
    });
    let explanation: PhaseBCustomerUpsellExplanation;

    try {
      const response = await this.#client.send(command);
      const text = extractTextFromBedrockResponse(response);
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
        provider: "bedrock",
        modelId: this.#modelId,
        region: this.#region,
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
}

export const resolveBedrockBffLlmService = (
  options: ResolveBffLlmServiceOptions,
): BffLlmService | null => {
  const modelId =
    options.modelId ?? process.env.BFF_BEDROCK_MODEL_ID ?? process.env.BEDROCK_MODEL_ID;
  const region = options.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;

  if (!modelId || !region) {
    return null;
  }

  const promptVersion = options.promptVersion ?? resolveDefaultPromptVersion();
  const branchName = options.branchName ?? resolveDefaultBranchName();
  const cacheDirectory = options.cacheDirectory ?? resolveDefaultCacheDirectory();
  const cacheTtlMs = options.cacheTtlMs ?? resolveDefaultCacheTtlMs();
  const deploymentId = options.deploymentId ?? resolveDefaultDeploymentId();
  const runtimeInstanceId = options.runtimeInstanceId ?? resolveDefaultRuntimeInstanceId();
  const now = options.now ?? Date.now;
  const client = options.bedrockClient ?? options.client ?? new BedrockRuntimeClient({ region });

  return new BedrockUpsellExplanationService({
    client,
    modelId,
    promptVersion,
    region,
    branchName,
    cacheDirectory,
    cacheTtlMs,
    deploymentId,
    runtimeInstanceId,
    now,
  });
};
