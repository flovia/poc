import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  type CustomerIntelligenceResponse,
  type EvidenceLabel,
  type PhaseBCustomerListResponse,
  type PhaseBCustomerProfileResponse,
  type PhaseBCustomerUpsellExplanation,
  type PhaseBCustomerUpsellExplanationInput,
  type PhaseBCustomerUpsellExplanationResponse,
  type PhaseBCustomerUpsellMetricsResponse,
  type PhaseBUpsellReasonCode,
  validatePhaseBCustomerUpsellExplanationResponse,
} from "contracts";

const GENERATED_FROM = "phase-b-llm-upsell-metrics-v1";
const UPSSELL_EXPLANATION_GENERATED_FROM = "phase-b-bedrock-upsell-explanation-v1";
const DEFAULT_BEDROCK_PROMPT_VERSION = "upsell-explanation-v1";
const DEFAULT_BEDROCK_MAX_TOKENS = 500;
const DEFAULT_BEDROCK_TEMPERATURE = 0.2;
const GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE =
  "Bedrock upsell explanation inference failed.";
const RECENT_ACTIVITY_DAYS = 7;
const HIGH_TX_COUNT_THRESHOLD = 5;
const FREE_TIER_NEAR_LIMIT_THRESHOLD = 0.8;
const TOP_SPENDER_PERCENTILE_THRESHOLD = 0.95;
const DAY_MS = 86_400_000;

const onchainReason: EvidenceLabel = {
  provenance: "onchain_fact",
  label: "payer wallet transfer facts",
  sourceFields: ["payerWallet", "amount", "timestamp"],
};

const projectionReason: EvidenceLabel = {
  provenance: "derived_insight",
  label: "BFF upsell metric aggregation",
};

const heuristicReason: EvidenceLabel = {
  provenance: "derived_insight",
  label: "deterministic upsell thresholds",
};

const bedrockReason: EvidenceLabel = {
  provenance: "derived_insight",
  label: "bedrock explanation from upsell metrics",
  sourceFields: ["signals", "flags", "reasonCodes", "caveats"],
};

const heuristicCaveats = [
  "activityGrowth is a PoC heuristic and not a strict live growth metric.",
  "freeTierProgress is a PoC heuristic and not an actual commercial plan limit.",
  "entryPointRatio is a simplified proxy and not a literal workflow entry-point metric.",
  "upsellOpportunity is a derived priority label and should be explained with supporting metrics.",
];

const compareAtomicDesc = (left: string, right: string) => {
  const l = BigInt(left);
  const r = BigInt(right);
  if (l === r) return 0;
  return l > r ? -1 : 1;
};

const daysBetween = (laterIso: string, earlierIso: string) =>
  Math.max(0, Math.floor((Date.parse(laterIso) - Date.parse(earlierIso)) / DAY_MS));

const percentileFromRank = (rank: number, total: number) => {
  if (total <= 1) return 1;
  return Number(((total - rank) / (total - 1)).toFixed(6));
};

const buildUpsellExplanationInput = (
  input: PhaseBCustomerUpsellMetricsResponse,
): PhaseBCustomerUpsellExplanationInput => ({
  signals: input.signals,
  flags: input.flags,
  reasonCodes: input.reasonCodes,
  caveats: input.caveats,
});

const buildUpsellExplanationSystemPrompt = (promptVersion: string) =>
  [
    "You are a B2B growth analyst for an API payments product.",
    `Prompt version: ${promptVersion}.`,
    "Return strict JSON only.",
    'Use exactly these keys: "summary", "reasons", "recommendedAction", "caution".',
    '"summary" must be a concise business explanation of why this wallet is or is not an upsell candidate.',
    '"reasons" must be an array of 2 or 3 short evidence-based sentences.',
    '"recommendedAction" must be one concise next action for sales, growth, or support.',
    '"caution" must mention uncertainty or heuristic limitations when relevant.',
    "Do not invent facts, rankings, or workflow claims that are not supported by the input.",
    "Write the output in Japanese for an internal business user.",
  ].join("\n");

const buildUpsellExplanationUserPrompt = (
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

const extractTextFromBedrockResponse = (response: {
  output?: { message?: { content?: Array<{ text?: string } | undefined> } };
}) => {
  const text = response.output?.message?.content
    ?.map((item) => (typeof item?.text === "string" ? item.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new BffLlmInferenceError("Bedrock response did not contain text output.");
  }

  return text;
};

const extractJsonObject = (text: string) => {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new BffLlmInferenceError("Bedrock response did not contain a JSON object.");
  }

  return text.slice(start, end + 1);
};

const formatErrorMessage = (error: Error) => {
  const prefix = error.name && error.name !== "Error" ? `${error.name}: ` : "";
  return `${prefix}${error.message}`.trim();
};

const describeErrorCause = (error: unknown) => {
  const seen = new Set<Error>();
  const parts: string[] = [];
  let current = error;

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    const message = formatErrorMessage(current);
    if (
      message &&
      message !== GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE &&
      !parts.includes(message)
    ) {
      parts.push(message);
    }
    current = current.cause;
  }

  return parts.join(" <- ");
};

type BuildUpsellMetricsByAddressInput = {
  customers: PhaseBCustomerListResponse;
  profilesByAddress: Record<string, PhaseBCustomerProfileResponse>;
  intelligenceByAddress?: Record<string, CustomerIntelligenceResponse>;
};

type ResolveBffLlmServiceOptions = {
  client?: BedrockRuntimeClient;
  modelId?: string;
  promptVersion?: string;
  region?: string;
};

type BedrockUpsellExplanationServiceOptions = {
  client: BedrockRuntimeClient;
  modelId: string;
  promptVersion: string;
  region: string;
};

export type BffLlmService = {
  generateUpsellExplanation(
    input: PhaseBCustomerUpsellMetricsResponse,
  ): Promise<PhaseBCustomerUpsellExplanationResponse>;
};

export class BffLlmUnavailableError extends Error {
  constructor(message = "Bedrock upsell explanation is not configured.") {
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

class BedrockUpsellExplanationService implements BffLlmService {
  readonly #client: BedrockRuntimeClient;
  readonly #modelId: string;
  readonly #promptVersion: string;
  readonly #region: string;

  constructor(options: BedrockUpsellExplanationServiceOptions) {
    this.#client = options.client;
    this.#modelId = options.modelId;
    this.#promptVersion = options.promptVersion;
    this.#region = options.region;
  }

  async generateUpsellExplanation(
    input: PhaseBCustomerUpsellMetricsResponse,
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
              text: buildUpsellExplanationUserPrompt(input, this.#promptVersion),
            },
          ],
        },
      ],
      inferenceConfig: {
        maxTokens: DEFAULT_BEDROCK_MAX_TOKENS,
        temperature: DEFAULT_BEDROCK_TEMPERATURE,
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
          ? `${GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE} ${causeDetail}`
          : GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE,
        {
          cause: error,
        },
      );
    }

    return validatePhaseBCustomerUpsellExplanationResponse({
      generatedAt: new Date().toISOString(),
      generatedFrom: UPSSELL_EXPLANATION_GENERATED_FROM,
      address: input.address,
      sourceGeneratedAt: input.sourceGeneratedAt,
      model: {
        provider: "bedrock",
        modelId: this.#modelId,
        region: this.#region,
        promptVersion: this.#promptVersion,
      },
      input: buildUpsellExplanationInput(input),
      explanation,
      provenance: "derived_insight",
      provenanceByField: {
        address: "onchain_fact",
        sourceGeneratedAt: "derived_insight",
        model: "derived_insight",
        input: "derived_insight",
        explanation: "derived_insight",
      },
      reasons: [bedrockReason],
    });
  }
}

export const resolveBffLlmService = (
  options: ResolveBffLlmServiceOptions = {},
): BffLlmService | null => {
  const modelId = options.modelId ?? process.env.BFF_BEDROCK_MODEL_ID ?? process.env.BEDROCK_MODEL_ID;
  const region =
    options.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  const promptVersion =
    options.promptVersion ??
    process.env.BFF_BEDROCK_PROMPT_VERSION ??
    DEFAULT_BEDROCK_PROMPT_VERSION;

  if (!modelId || !region) {
    return null;
  }

  const client = options.client ?? new BedrockRuntimeClient({ region });

  return new BedrockUpsellExplanationService({
    client,
    modelId,
    promptVersion,
    region,
  });
};

export const buildUpsellMetricsByAddress = ({
  customers,
  profilesByAddress,
  intelligenceByAddress = {},
}: BuildUpsellMetricsByAddressInput): Record<string, PhaseBCustomerUpsellMetricsResponse> => {
  const rankedCustomers = [...customers.customers].sort((left, right) => {
    const bySpend = compareAtomicDesc(left.spendAtomic, right.spendAtomic);
    if (bySpend !== 0) return bySpend;
    return left.address.localeCompare(right.address);
  });
  const rankByAddress = new Map(
    rankedCustomers.map((customer, index) => [customer.address.toLowerCase(), index + 1]),
  );

  return Object.fromEntries(
    customers.customers.flatMap((customer) => {
      const address = customer.address.toLowerCase();
      const profile = profilesByAddress[address];
      if (!profile) return [];

      const intelligence = intelligenceByAddress[address];
      const spendRank = rankByAddress.get(address) ?? customers.customerCount;
      const spendPercentile = percentileFromRank(spendRank, customers.customerCount);
      const txCount = profile.profile.metrics.txCount ?? customer.observationCount;
      const providerCount =
        profile.profile.metrics.uniqueProviderCount ?? customer.providerCount;
      const firstSeenAt = profile.profile.metrics.firstSeenAt ?? null;
      const lastSeenAt =
        profile.profile.metrics.lastSeenAt ?? customer.lastSeenAt ?? null;
      const daysSinceLastSeen =
        lastSeenAt === null ? null : daysBetween(profile.generatedAt, lastSeenAt);
      const x402ServiceCount = intelligence?.x402Services.length ?? 0;

      const flags = {
        isTopSpender: spendPercentile >= TOP_SPENDER_PERCENTILE_THRESHOLD,
        isRecentlyActive:
          daysSinceLastSeen !== null && daysSinceLastSeen <= RECENT_ACTIVITY_DAYS,
        isMultiProvider: providerCount >= 2,
        hasHighTransactionCount: txCount >= HIGH_TX_COUNT_THRESHOLD,
        isNearFreeTierLimit:
          profile.profile.metrics.freeTierProgress >= FREE_TIER_NEAR_LIMIT_THRESHOLD,
        hasExternalX402Usage: x402ServiceCount > 0,
        isHighUpsellCandidate: profile.profile.metrics.upsellOpportunity === "high",
      } as const;

      const reasonCodes: PhaseBUpsellReasonCode[] = [
        flags.isTopSpender ? "top_spender" : null,
        flags.isRecentlyActive ? "recently_active" : null,
        flags.isMultiProvider ? "multi_provider_usage" : null,
        flags.hasHighTransactionCount ? "high_transaction_count" : null,
        flags.isNearFreeTierLimit ? "free_tier_near_limit" : null,
        flags.hasExternalX402Usage ? "external_x402_usage" : null,
        flags.isHighUpsellCandidate ? "high_upsell_score" : null,
      ].filter((value): value is PhaseBUpsellReasonCode => value !== null);

      const response: PhaseBCustomerUpsellMetricsResponse = {
        generatedAt: new Date().toISOString(),
        generatedFrom: GENERATED_FROM,
        address: customer.address,
        sourceGeneratedAt: profile.generatedAt,
        signals: {
          spendAtomic: profile.profile.metrics.totalSpendAtomic ?? customer.spendAtomic,
          spendRank,
          spendPercentile,
          customerCount: customers.customerCount,
          observationCount: customer.observationCount,
          providerCount,
          txCount,
          averageSpendAtomic: profile.profile.metrics.averageSpendAtomic ?? null,
          firstSeenAt,
          lastSeenAt,
          daysSinceLastSeen,
          freeTierProgress: profile.profile.metrics.freeTierProgress,
          activityGrowth: profile.profile.metrics.activityGrowth,
          entryPointRatio: profile.profile.metrics.entryPointRatio,
          upsellOpportunity: profile.profile.metrics.upsellOpportunity,
          x402ServiceCount,
        },
        flags: { ...flags },
        reasonCodes,
        caveats: heuristicCaveats,
        provenance: "derived_insight",
        provenanceByField: {
          address: "onchain_fact",
          sourceGeneratedAt: "derived_insight",
          signals: "derived_insight",
          flags: "derived_insight",
          reasonCodes: "derived_insight",
          caveats: "derived_insight",
        },
        evidence: intelligence
          ? [onchainReason, projectionReason, heuristicReason]
          : [onchainReason, heuristicReason],
        reasons: intelligence
          ? [onchainReason, projectionReason, heuristicReason]
          : [onchainReason, heuristicReason],
      };

      return [[address, response] as const];
    }),
  );
};
