import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import type { LoadModelOptions } from "@qvac/sdk";
import {
  type EvidenceLabel,
  type PhaseBCustomerUpsellExplanationInput,
  type PhaseBCustomerUpsellExplanationResponse,
  type PhaseBCustomerUpsellMetricsResponse,
  validatePhaseBCustomerUpsellExplanationResponse,
} from "contracts";

export type LlmProvider = "qvac" | "bedrock";
export type QvacModelSource = LoadModelOptions["modelSrc"];

export const UPSSELL_EXPLANATION_GENERATED_FROM = "phase-b-llm-upsell-explanation-v1";
export const DEFAULT_LLM_MAX_TOKENS = 500;
export const DEFAULT_LLM_TEMPERATURE = 0.2;

const DEFAULT_LLM_PROMPT_VERSION = "upsell-explanation-v1";
const DEFAULT_LLM_BRANCH_NAME = "unknown-branch";
const DEFAULT_LLM_CACHE_DIRNAME = "bff-llm-cache";
const DEFAULT_QVAC_CONTEXT_SIZE = 2048;
const DEFAULT_QVAC_DEVICE = "gpu";
const DAY_MS = 86_400_000;
const DEFAULT_LLM_CACHE_TTL_MS = DAY_MS;

export const GENERIC_LLM_INFERENCE_ERROR_MESSAGE = "LLM upsell explanation inference failed.";

export const llmReason: EvidenceLabel = {
  provenance: "derived_insight",
  label: "llm explanation from upsell metrics",
  sourceFields: ["signals", "flags", "reasonCodes", "caveats"],
};

export const buildUpsellExplanationInput = (
  input: PhaseBCustomerUpsellMetricsResponse,
): PhaseBCustomerUpsellExplanationInput => ({
  signals: input.signals,
  flags: input.flags,
  reasonCodes: input.reasonCodes,
  caveats: input.caveats,
});

export const buildUpsellExplanationSystemPrompt = (promptVersion: string) =>
  [
    "You are a B2B growth analyst for an API payments product.",
    `Prompt version: ${promptVersion}.`,
    "Return strict JSON only.",
    'Use exactly these keys: "summary", "reasons", "recommendedAction", "caution".',
    '"summary" must be a short headline of 3 to 6 words.',
    '"reasons" must be an array of 2 or 3 short evidence-based sentences.',
    '"recommendedAction" must be one concise, evidence-based next step for sales, growth, or support.',
    '"caution" must mention uncertainty or heuristic limitations when relevant.',
    "Do not invent facts, rankings, or workflow claims that are not supported by the input.",
    "Base every claim only on the provided metrics, flags, reason codes, and caveats.",
    'Prefer cautious language such as "suggests", "may indicate", "is consistent with", or "appears".',
    "Do not infer customer intent, dependency, maturity, urgency, or growth unless the input directly supports it.",
    "Do not mention exact deadlines, outreach timing, commercial plan limits, or imminent overage unless the input explicitly states them.",
    "If the input uses PoC heuristics, reflect that uncertainty in the summary or caution instead of turning it into a hard business fact.",
    "Write the output in English for an internal business user.",
  ].join("\n");

export const buildUpsellExplanationUserPrompt = (
  input: PhaseBCustomerUpsellMetricsResponse,
  promptVersion: string,
) =>
  JSON.stringify(
    {
      task: "Generate an upsell explanation for one wallet.",
      promptVersion,
      address: input.address,
      metrics: buildUpsellExplanationInput(input),
    },
    null,
    2,
  );

export class BffLlmUnavailableError extends Error {
  constructor(message = "LLM upsell explanation is not configured.") {
    super(message);
    this.name = "BffLlmUnavailableError";
  }
}

export class BffLlmInferenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BffLlmInferenceError";
  }
}

export const extractTextFromBedrockResponse = (response: {
  output?: { message?: { content?: Array<{ text?: string } | undefined> } };
}) => {
  const text = response.output?.message?.content
    ?.map((item) => (typeof item?.text === "string" ? item.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new BffLlmInferenceError("LLM response did not contain text output.");
  }

  return text;
};

export const extractJsonObject = (text: string) => {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new BffLlmInferenceError("LLM response did not contain a JSON object.");
  }

  return text.slice(start, end + 1);
};

const formatErrorMessage = (error: Error) => {
  const prefix = error.name && error.name !== "Error" ? `${error.name}: ` : "";
  return `${prefix}${error.message}`.trim();
};

export const describeErrorCause = (error: unknown) => {
  const seen = new Set<Error>();
  const parts: string[] = [];
  let current = error;

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    const message = formatErrorMessage(current);
    if (message && message !== GENERIC_LLM_INFERENCE_ERROR_MESSAGE && !parts.includes(message)) {
      parts.push(message);
    }
    current = current.cause;
  }

  return parts.join(" <- ");
};

export const normalizeConfiguredValue = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export const normalizeLlmProvider = (value: string | undefined): LlmProvider | undefined => {
  const normalized = normalizeConfiguredValue(value)?.toLowerCase();
  if (normalized === "bedrock" || normalized === "qvac") {
    return normalized;
  }

  return undefined;
};

const normalizePositiveInteger = (value: string | undefined) => {
  const normalized = normalizeConfiguredValue(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const resolveDefaultCacheDirectory = () => {
  const configuredDirectory = normalizeConfiguredValue(process.env.BFF_LLM_CACHE_DIR);
  if (configuredDirectory) {
    return configuredDirectory;
  }

  const databaseUrl = normalizeConfiguredValue(process.env.DATABASE_URL);
  if (databaseUrl?.startsWith("file:")) {
    try {
      return path.join(path.dirname(new URL(databaseUrl).pathname), DEFAULT_LLM_CACHE_DIRNAME);
    } catch {
      return path.join(process.cwd(), "tmp", DEFAULT_LLM_CACHE_DIRNAME);
    }
  }

  if (databaseUrl) {
    return path.join(path.dirname(databaseUrl), DEFAULT_LLM_CACHE_DIRNAME);
  }

  return path.join(process.cwd(), "tmp", DEFAULT_LLM_CACHE_DIRNAME);
};

export const resolveDefaultBranchName = () =>
  normalizeConfiguredValue(process.env.BFF_BRANCH_NAME ?? process.env.DEPLOY_BRANCH) ??
  DEFAULT_LLM_BRANCH_NAME;

export const resolveDefaultDeploymentId = () => normalizeConfiguredValue(process.env.BFF_DEPLOY_ID);

export const resolveDefaultRuntimeInstanceId = () =>
  normalizeConfiguredValue(process.env.HOSTNAME);

export const resolveDefaultPromptVersion = () =>
  normalizeConfiguredValue(
    process.env.BFF_LLM_PROMPT_VERSION ?? process.env.BFF_BEDROCK_PROMPT_VERSION,
  ) ?? DEFAULT_LLM_PROMPT_VERSION;

export const resolveDefaultCacheTtlMs = () => {
  const raw = normalizeConfiguredValue(process.env.BFF_LLM_CACHE_TTL_MS);
  if (!raw) {
    return DEFAULT_LLM_CACHE_TTL_MS;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LLM_CACHE_TTL_MS;
};

export const resolveDefaultQvacModelSource = () =>
  normalizeConfiguredValue(process.env.BFF_QVAC_MODEL_SRC);

export const resolveDefaultQvacDevice = () =>
  normalizeConfiguredValue(process.env.BFF_QVAC_DEVICE) ?? DEFAULT_QVAC_DEVICE;

export const resolveDefaultQvacContextSize = () =>
  normalizePositiveInteger(process.env.BFF_QVAC_CTX_SIZE) ?? DEFAULT_QVAC_CONTEXT_SIZE;

export const stringifyQvacModelSource = (modelSrc: QvacModelSource) =>
  typeof modelSrc === "string" ? modelSrc : modelSrc.src;

export const deriveQvacModelId = (modelSrc: QvacModelSource) => {
  if (typeof modelSrc !== "string") {
    const configuredId = modelSrc.modelId ?? modelSrc.name;
    if (configuredId) {
      return configuredId;
    }
  }

  const normalizedSource = stringifyQvacModelSource(modelSrc).replace(/[?#].*$/, "");
  return normalizedSource.split(/[\\/]/).filter(Boolean).pop() ?? "qvac-model";
};

export const buildUpsellExplanationCacheKey = (input: {
  branchName: string;
  provider: LlmProvider;
  modelId: string;
  promptVersion: string;
  modelFingerprint?: Record<string, unknown>;
  deploymentId?: string;
  runtimeInstanceId?: string;
  address: string;
  sourceGeneratedAt: string;
  explanationInput: PhaseBCustomerUpsellExplanationInput;
}) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        branchName: input.branchName,
        model: {
          provider: input.provider,
          modelId: input.modelId,
          promptVersion: input.promptVersion,
          ...(input.modelFingerprint ?? {}),
        },
        cacheScope: {
          deploymentId: input.deploymentId,
          runtimeInstanceId: input.runtimeInstanceId,
        },
        request: {
          address: input.address,
          sourceGeneratedAt: input.sourceGeneratedAt,
          input: input.explanationInput,
        },
      }),
    )
    .digest("hex");

const buildUpsellExplanationCacheFilePath = (cacheDirectory: string, cacheKey: string) =>
  path.join(cacheDirectory, `${cacheKey}.json`);

const isCachedUpsellExplanationFresh = (
  value: PhaseBCustomerUpsellExplanationResponse,
  nowMs: number,
  cacheTtlMs: number,
) => {
  if (cacheTtlMs <= 0) {
    return false;
  }

  const generatedAtMs = Date.parse(value.generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    return false;
  }

  return nowMs - generatedAtMs <= cacheTtlMs;
};

const isNodeErrorWithCode = (error: unknown, code: string) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === code;

export const readCachedUpsellExplanation = async (
  cacheDirectory: string,
  cacheKey: string,
  nowMs: number,
  cacheTtlMs: number,
): Promise<PhaseBCustomerUpsellExplanationResponse | null> => {
  const filePath = buildUpsellExplanationCacheFilePath(cacheDirectory, cacheKey);

  try {
    const payload = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
    const validated = validatePhaseBCustomerUpsellExplanationResponse(payload);
    if (isCachedUpsellExplanationFresh(validated, nowMs, cacheTtlMs)) {
      return validated;
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

export const writeCachedUpsellExplanation = async (
  cacheDirectory: string,
  cacheKey: string,
  value: PhaseBCustomerUpsellExplanationResponse,
) => {
  await fs.mkdir(cacheDirectory, { recursive: true });

  const filePath = buildUpsellExplanationCacheFilePath(cacheDirectory, cacheKey);
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

export type QvacInferenceInput = {
  modelId: string;
  history: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
};

export type QvacSdkClient = {
  downloadAsset?(options: { assetSrc: QvacModelSource }): Promise<unknown>;
  loadModel(options: LoadModelOptions): Promise<string>;
  completeText(input: QvacInferenceInput): Promise<string>;
};

export type ResolveBffLlmServiceOptions = {
  provider?: LlmProvider;
  client?: BedrockRuntimeClient;
  bedrockClient?: BedrockRuntimeClient;
  qvacClient?: QvacSdkClient;
  modelId?: string;
  promptVersion?: string;
  region?: string;
  qvacModelSrc?: QvacModelSource;
  qvacModelId?: string;
  qvacDevice?: string;
  qvacContextSize?: number;
  branchName?: string;
  cacheDirectory?: string;
  cacheTtlMs?: number;
  deploymentId?: string;
  runtimeInstanceId?: string;
  now?: () => number;
};

export type BffLlmService = {
  generateUpsellExplanation(
    input: PhaseBCustomerUpsellMetricsResponse,
  ): Promise<PhaseBCustomerUpsellExplanationResponse>;
};
