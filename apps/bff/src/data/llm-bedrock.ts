import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  PhaseBCustomerWorkflowIntentExplanationSchema,
  type PhaseBCustomerWorkflowIntentInput,
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
  resolveDefaultWorkflowIntentPromptVersion,
  type ResolveBffLlmServiceOptions,
  type WorkflowIntentLlmRequest,
  type WorkflowIntentLlmResult,
  writeCachedUpsellExplanation,
} from "./llm-shared";

const GENERIC_WORKFLOW_DISCLAIMER_PATTERN =
  /\b(?:the\s+input|the\s+data)\s+does\s+not\s+specify\b/i;
const DEFAULT_WORKFLOW_INTENT_CAUTION =
  "This is inferred from payment-linked API activity and may miss offchain context.";
const GENERIC_WORKFLOW_INTENT_INFERENCE_ERROR_MESSAGE =
  "Workflow intent explanation inference failed.";

const buildWorkflowIntentSystemPrompt = (promptVersion: string) =>
  [
    "You are a product analyst explaining short bursts of paid API activity from one wallet.",
    `Prompt version: ${promptVersion}.`,
    "Return strict JSON only.",
    'Use exactly one top-level key: "explanations".',
    '"explanations" must be an array of objects with exactly these keys: "sessionId", "summary", "intent", "scenarios", "evidence", "caution".',
    '"summary" must be a short title of 3 to 6 words.',
    '"intent" must be 1 or 2 sentences explaining the likely operational goal of the burst.',
    '"scenarios" must be an array of 2 or 3 short possible user-goal hypotheses.',
    '"evidence" must be an array of 2 or 3 short evidence-based sentences.',
    '"caution" must be one short sentence about uncertainty or interpretation limits.',
    "Base every claim only on the ordered provider names, activity labels, descriptions, timing, and amounts in the input.",
    "Use cautious language such as suggests, appears consistent with, may indicate, or looks like.",
    "Do not claim a precise business objective, trade, or user plan as fact when the input is ambiguous.",
    "Do not invent tokens, strategies, counterparties, offchain context, or missing workflow steps.",
    "If the sequence is ambiguous, describe it as monitoring, orchestration, evaluation, or readiness checking rather than a specific action.",
    'Do not use phrases such as "the input does not specify", "the data does not specify", or similar boilerplate refusals.',
    "Prefer concrete short scenario candidates such as threshold checking, pre-trade evaluation, monitoring, or workflow orchestration when supported by the sequence.",
    "Write the output in English for an internal product user.",
  ].join("\n");

const buildWorkflowIntentUserPrompt = (request: WorkflowIntentLlmRequest, promptVersion: string) =>
  JSON.stringify(
    {
      task: "Explain likely user intent for short multi-step wallet workflow sessions.",
      promptVersion,
      address: request.address,
      sourceGeneratedAt: request.sourceGeneratedAt,
      sessions: request.input.sessions,
      sessionWindowSeconds: request.input.sessionWindowSeconds,
    },
    null,
    2,
  );

const normalizeWorkflowExplanationText = (value: string | undefined) => {
  if (!value) return "";

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const kept = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !GENERIC_WORKFLOW_DISCLAIMER_PATTERN.test(part));

  return kept.join(" ").trim();
};

const uniqueNonEmpty = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

const buildFallbackWorkflowIntentSummary = (
  session: PhaseBCustomerWorkflowIntentInput["sessions"][number],
) => {
  if (session.distinctProviderCount >= 3) return "Cross-provider workflow check";
  if (session.distinctProviderCount === 2) return "Multi-step API evaluation";
  return "Short automated API loop";
};

const buildFallbackWorkflowIntent = (
  session: PhaseBCustomerWorkflowIntentInput["sessions"][number],
) =>
  session.distinctProviderCount >= 2
    ? "This burst appears consistent with a wallet evaluating multiple API results before deciding the next operational step."
    : "This burst appears consistent with a wallet running a short automated check before deciding whether to continue.";

const buildFallbackWorkflowScenarios = (
  session: PhaseBCustomerWorkflowIntentInput["sessions"][number],
) => {
  const rawText = [
    ...session.providers.map((provider) => provider.providerName),
    ...session.providers.flatMap((provider) => provider.activityLabels),
    ...session.events.map((event) => event.description),
  ]
    .join(" ")
    .toLowerCase();

  const scenarios: string[] = [];

  if (/(price|quote|market|swap|liquidity|trade|token)/.test(rawText)) {
    scenarios.push("A bot checking market or quote conditions before deciding whether to execute.");
  }

  if (/(llm|response|completion|inference|model|prompt|agent)/.test(rawText)) {
    scenarios.push("An agent evaluating retrieved results before choosing the next API step.");
  }

  if (/(search|query|lookup|fetch|scan|discover)/.test(rawText)) {
    scenarios.push("A lookup workflow gathering enough context for a downstream decision.");
  }

  scenarios.push(
    "An automated workflow validating whether current conditions justify another action.",
  );
  scenarios.push(
    "A monitoring or orchestration loop checking state before continuing the session.",
  );

  return uniqueNonEmpty(scenarios).slice(0, 3);
};

const buildFallbackWorkflowEvidence = (
  session: PhaseBCustomerWorkflowIntentInput["sessions"][number],
) => {
  const lines = [
    `The burst completed within ${Math.max(1, Math.floor(session.durationSeconds / 60))} minutes.`,
    `${session.eventCount} paid API calls appeared in one ordered session.`,
  ];

  if (session.distinctProviderCount >= 2) {
    lines.push(
      `${session.distinctProviderCount} distinct APIs appeared in the same short workflow burst.`,
    );
  }

  return lines;
};

const normalizeWorkflowIntentExplanation = (
  raw: unknown,
  sessionById: Map<string, PhaseBCustomerWorkflowIntentInput["sessions"][number]>,
) => {
  const candidate = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const sessionId = typeof candidate.sessionId === "string" ? candidate.sessionId.trim() : "";
  if (!sessionId) {
    throw new BffLlmInferenceError("Workflow intent explanation is missing sessionId.");
  }

  const session = sessionById.get(sessionId);
  if (!session) {
    throw new BffLlmInferenceError(
      `Workflow intent explanation references unknown sessionId: ${sessionId}.`,
    );
  }

  const summary =
    normalizeWorkflowExplanationText(
      typeof candidate.summary === "string" ? candidate.summary : undefined,
    ) || buildFallbackWorkflowIntentSummary(session);
  const intent =
    normalizeWorkflowExplanationText(
      typeof candidate.intent === "string" ? candidate.intent : undefined,
    ) || buildFallbackWorkflowIntent(session);
  const scenarios = uniqueNonEmpty(
    (Array.isArray(candidate.scenarios) ? candidate.scenarios : [])
      .map((item) => normalizeWorkflowExplanationText(typeof item === "string" ? item : undefined))
      .filter(Boolean),
  );
  const evidence = uniqueNonEmpty(
    (Array.isArray(candidate.evidence) ? candidate.evidence : [])
      .map((item) => normalizeWorkflowExplanationText(typeof item === "string" ? item : undefined))
      .filter(Boolean),
  );
  const caution =
    normalizeWorkflowExplanationText(
      typeof candidate.caution === "string" ? candidate.caution : undefined,
    ) || DEFAULT_WORKFLOW_INTENT_CAUTION;

  return PhaseBCustomerWorkflowIntentExplanationSchema.parse({
    sessionId,
    summary,
    intent,
    scenarios:
      scenarios.length >= 2 ? scenarios.slice(0, 3) : buildFallbackWorkflowScenarios(session),
    evidence: evidence.length > 0 ? evidence : buildFallbackWorkflowEvidence(session),
    caution,
  });
};

const buildCacheFilePath = (cacheDirectory: string, cacheKey: string) =>
  path.join(cacheDirectory, `${cacheKey}.json`);

type CachedWorkflowIntentResult = WorkflowIntentLlmResult & { generatedAt: string };

const isNodeErrorWithCode = (error: unknown, code: string) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === code;

const buildWorkflowIntentCacheKey = (input: {
  branchName: string;
  modelId: string;
  region: string;
  promptVersion: string;
  deploymentId?: string;
  runtimeInstanceId?: string;
  request: WorkflowIntentLlmRequest;
}) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        branchName: input.branchName,
        model: {
          provider: "bedrock",
          modelId: input.modelId,
          region: input.region,
          promptVersion: input.promptVersion,
        },
        cacheScope: {
          deploymentId: input.deploymentId,
          runtimeInstanceId: input.runtimeInstanceId,
        },
        request: input.request,
      }),
    )
    .digest("hex");

const isCachedWorkflowIntentFresh = (
  value: CachedWorkflowIntentResult,
  nowMs: number,
  cacheTtlMs: number,
) => {
  if (cacheTtlMs <= 0) return false;

  const generatedAtMs = Date.parse(value.generatedAt);
  if (!Number.isFinite(generatedAtMs)) return false;

  return nowMs - generatedAtMs <= cacheTtlMs;
};

const readCachedWorkflowIntent = async (
  cacheDirectory: string,
  cacheKey: string,
  nowMs: number,
  cacheTtlMs: number,
): Promise<WorkflowIntentLlmResult | null> => {
  const filePath = buildCacheFilePath(cacheDirectory, cacheKey);

  try {
    const payload = JSON.parse(await fs.readFile(filePath, "utf8")) as CachedWorkflowIntentResult;
    if (
      isCachedWorkflowIntentFresh(payload, nowMs, cacheTtlMs) &&
      Array.isArray(payload.explanations) &&
      payload.model
    ) {
      return {
        model: payload.model,
        explanations: payload.explanations.map((item) =>
          PhaseBCustomerWorkflowIntentExplanationSchema.parse(item),
        ),
      };
    }

    await fs.rm(filePath, { force: true });
    return null;
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return null;
    }

    try {
      await fs.rm(filePath, { force: true });
    } catch {
      // Ignore cache cleanup failures and allow regeneration below.
    }

    return null;
  }
};

const writeCachedWorkflowIntent = async (
  cacheDirectory: string,
  cacheKey: string,
  value: CachedWorkflowIntentResult,
) => {
  await fs.mkdir(cacheDirectory, { recursive: true });

  const filePath = buildCacheFilePath(cacheDirectory, cacheKey);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await fs.writeFile(tempPath, JSON.stringify(value, null, 2));
    await fs.rename(tempPath, filePath);
  } finally {
    try {
      await fs.rm(tempPath, { force: true });
    } catch {
      // Ignore temp cleanup failures after write attempts.
    }
  }
};

type BedrockUpsellExplanationServiceOptions = {
  client: BedrockRuntimeClient;
  modelId: string;
  promptVersion: string;
  workflowPromptVersion: string;
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
  readonly #workflowPromptVersion: string;
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
  readonly #workflowInflightByCacheKey = new Map<string, Promise<WorkflowIntentLlmResult>>();

  constructor(options: BedrockUpsellExplanationServiceOptions) {
    this.#client = options.client;
    this.#modelId = options.modelId;
    this.#promptVersion = options.promptVersion;
    this.#workflowPromptVersion = options.workflowPromptVersion;
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

  async generateWorkflowIntentExplanation(
    request: WorkflowIntentLlmRequest,
  ): Promise<WorkflowIntentLlmResult> {
    const cacheKey = buildWorkflowIntentCacheKey({
      branchName: this.#branchName,
      modelId: this.#modelId,
      region: this.#region,
      promptVersion: this.#workflowPromptVersion,
      deploymentId: this.#deploymentId,
      runtimeInstanceId: this.#runtimeInstanceId,
      request,
    });
    const cached = await readCachedWorkflowIntent(
      this.#cacheDirectory,
      cacheKey,
      this.#now(),
      this.#cacheTtlMs,
    );

    if (cached) {
      return cached;
    }

    const inflight = this.#workflowInflightByCacheKey.get(cacheKey);
    if (inflight) {
      return await inflight;
    }

    const generation = this.#generateAndCacheWorkflowIntent(request, cacheKey);
    this.#workflowInflightByCacheKey.set(cacheKey, generation);

    try {
      return await generation;
    } finally {
      this.#workflowInflightByCacheKey.delete(cacheKey);
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

  async #generateAndCacheWorkflowIntent(request: WorkflowIntentLlmRequest, cacheKey: string) {
    const response = await this.#generateWorkflowIntentUncached(request);
    await writeCachedWorkflowIntent(this.#cacheDirectory, cacheKey, {
      generatedAt: new Date(this.#now()).toISOString(),
      ...response,
    });
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

  async #generateWorkflowIntentUncached(
    request: WorkflowIntentLlmRequest,
  ): Promise<WorkflowIntentLlmResult> {
    const command = new ConverseCommand({
      modelId: this.#modelId,
      system: [{ text: buildWorkflowIntentSystemPrompt(this.#workflowPromptVersion) }],
      messages: [
        {
          role: "user",
          content: [{ text: buildWorkflowIntentUserPrompt(request, this.#workflowPromptVersion) }],
        },
      ],
      inferenceConfig: {
        maxTokens: DEFAULT_LLM_MAX_TOKENS,
        temperature: DEFAULT_LLM_TEMPERATURE,
      },
    });

    try {
      const response = await this.#client.send(command);
      const text = extractTextFromBedrockResponse(response);
      const payload = JSON.parse(extractJsonObject(text)) as { explanations?: unknown[] };
      const sessionById = new Map(
        request.input.sessions.map((session) => [session.sessionId, session] as const),
      );

      return {
        model: {
          provider: "bedrock",
          modelId: this.#modelId,
          region: this.#region,
          promptVersion: this.#workflowPromptVersion,
        },
        explanations: Array.isArray(payload.explanations)
          ? payload.explanations.map((item) =>
              normalizeWorkflowIntentExplanation(item, sessionById),
            )
          : [],
      };
    } catch (error) {
      if (error instanceof BffLlmInferenceError) {
        throw error;
      }

      const causeDetail = describeErrorCause(error);
      throw new BffLlmInferenceError(
        causeDetail
          ? `${GENERIC_WORKFLOW_INTENT_INFERENCE_ERROR_MESSAGE} ${causeDetail}`
          : GENERIC_WORKFLOW_INTENT_INFERENCE_ERROR_MESSAGE,
        {
          cause: error,
        },
      );
    }
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
  const workflowPromptVersion =
    options.workflowPromptVersion ?? resolveDefaultWorkflowIntentPromptVersion();
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
    workflowPromptVersion,
    region,
    branchName,
    cacheDirectory,
    cacheTtlMs,
    deploymentId,
    runtimeInstanceId,
    now,
  });
};
