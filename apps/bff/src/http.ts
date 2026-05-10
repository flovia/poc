import {
  normalizePaymentRecipientAddress,
  validatePhaseBCustomerWorkflowIntentResponse,
} from "contracts";
import { type BffAnalyticsDataSource, resolveAnalyticsDataSource } from "./data/analytics-source";
import { BffLlmInferenceError, type BffLlmService, resolveBffLlmService } from "./data/llm";
import { buildWorkflowIntentInputFromProfile, toWorkflowIntentInput } from "./data/workflow-intent";
import { handleShowcaseRoute, showcaseRoutes } from "./showcase";

type JsonValue = unknown;
type RuntimeEnv = NodeJS.ProcessEnv;
export type BffRuntimeMetadata = {
  commitHash: string | null;
  startedAt: string;
};

const GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE = "Bedrock upsell explanation inference failed.";
const WORKFLOW_INTENT_GENERATED_FROM = "phase-b-wallet-workflow-intent-v1";
const COMMIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/i;
const workflowIntentReason = {
  provenance: "derived_insight" as const,
  label: "BFF workflow intent session analysis",
};

const json = (body: JsonValue, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });

const normalizeCommitHash = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed || !COMMIT_HASH_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
};

const resolveCommitHash = (env: RuntimeEnv) =>
  normalizeCommitHash(env.BFF_COMMIT_HASH) ??
  normalizeCommitHash(env.DEPLOY_GIT_SHA) ??
  normalizeCommitHash(env.GITHUB_SHA) ??
  normalizeCommitHash(env.BFF_DEPLOY_ID) ??
  "unknown";

export const resolveBffRuntimeMetadata = (
  env: RuntimeEnv = process.env,
  now: Date = new Date(),
): BffRuntimeMetadata => ({
  commitHash: resolveCommitHash(env),
  startedAt: now.toISOString(),
});

const readonlyRoutes = new Set([
  "/",
  "/health",
  "/providers",
  "/customers",
  "/wallet-usage-graph",
  "/analytics/services/coingecko/summary",
  "/analytics/services/comparison",
  "/analytics/services/quadrants",
  "/analytics/routes/summary",
  "/analytics/routes/sankey",
]);

const toProfileAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/profile$/);
  return match?.[1] ?? null;
};

const toIntelligenceAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/intelligence$/);
  return match?.[1] ?? null;
};

const toUpsellMetricsAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/llm\/upsell-metrics$/);
  return match?.[1] ?? null;
};

const toUpsellExplanationAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/llm\/upsell-explanation$/);
  return match?.[1] ?? null;
};

const toWorkflowIntentAddress = (path: string) => {
  const match = path.match(/^\/customers\/([^/]+)\/llm\/workflow-intent$/);
  return match?.[1] ?? null;
};

const methodNotAllowed = () =>
  json(
    {
      error: "method_not_allowed",
      message: "The BFF only supports GET for read endpoints.",
    },
    { status: 405, headers: { allow: "GET" } },
  );

const llmUnavailable = () =>
  json(
    {
      error: "llm_unavailable",
      message: "Bedrock upsell explanation is not configured for this environment.",
    },
    { status: 503 },
  );

const llmFailed = (error: unknown) =>
  json(
    {
      error: "llm_failed",
      message:
        error instanceof BffLlmInferenceError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : GENERIC_BEDROCK_INFERENCE_ERROR_MESSAGE,
    },
    { status: 502 },
  );

export const createBffHandler =
  (
    dataSource:
      | BffAnalyticsDataSource
      | Promise<BffAnalyticsDataSource> = resolveAnalyticsDataSource(),
    llmService: BffLlmService | null = resolveBffLlmService(),
    runtimeMetadata: BffRuntimeMetadata = resolveBffRuntimeMetadata(),
  ) =>
  async (request: Request) => {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method !== "GET") {
      if (
        request.method === "POST" &&
        (path === "/showcase/stripe-mpp/pay" || path === "/showcase/solana-mpp/pay")
      ) {
        return handleShowcaseRoute(request, path) ?? notFound(path);
      }

      if (
        readonlyRoutes.has(path) ||
        showcaseRoutes.has(path) ||
        toProfileAddress(path) !== null ||
        toIntelligenceAddress(path) !== null ||
        toUpsellMetricsAddress(path) !== null ||
        toUpsellExplanationAddress(path) !== null ||
        toWorkflowIntentAddress(path) !== null
      ) {
        return methodNotAllowed();
      }

      return notFound(path);
    }

    switch (path) {
      case "/":
        return json({ service: "flovia-bff", status: "ok" });
      case "/health":
        return json({
          status: "ok",
          service: "flovia-bff",
          commitHash: runtimeMetadata.commitHash,
          startedAt: runtimeMetadata.startedAt,
        });
      default:
        break;
    }

    const showcaseResponse = handleShowcaseRoute(request, path);
    if (showcaseResponse) return showcaseResponse;

    const resolvedDataSource = await dataSource;

    switch (path) {
      case "/providers":
        return json(resolvedDataSource.providers);
      case "/customers": {
        const serviceId = url.searchParams.get("serviceId");
        if (serviceId) {
          return json(resolvedDataSource.getCustomersByServiceId(serviceId));
        }
        return json(resolvedDataSource.getCustomers(url.searchParams.get("payTo") ?? undefined));
      }
      case "/wallet-usage-graph":
        return json(resolvedDataSource.walletUsageGraph);
      case "/analytics/services/coingecko/summary":
        return json(resolvedDataSource.serviceSummary);
      case "/analytics/services/comparison":
        return json(resolvedDataSource.serviceComparison);
      case "/analytics/services/quadrants":
        return json(resolvedDataSource.serviceQuadrants);
      case "/analytics/routes/summary":
        return json(resolvedDataSource.routeSummary);
      case "/analytics/routes/sankey":
        return json(resolvedDataSource.routeSankey);
      default:
        break;
    }

    const address = toProfileAddress(path);
    if (address !== null) {
      const normalizedAddress = normalizePaymentRecipientAddress(address);
      const profile = resolvedDataSource.getCustomerProfile(normalizedAddress);

      if (!profile) {
        return notFound(path);
      }

      return json(profile);
    }

    const intelligenceAddress = toIntelligenceAddress(path);
    if (intelligenceAddress !== null) {
      const normalizedAddress = normalizePaymentRecipientAddress(intelligenceAddress);
      const intelligence = resolvedDataSource.getCustomerIntelligence(normalizedAddress);

      if (!intelligence) {
        return notFound(path);
      }

      return json(intelligence);
    }

    const upsellMetricsAddress = toUpsellMetricsAddress(path);
    if (upsellMetricsAddress !== null) {
      const normalizedAddress = normalizePaymentRecipientAddress(upsellMetricsAddress);
      const metrics = resolvedDataSource.getCustomerUpsellMetrics(normalizedAddress);

      if (!metrics) {
        return notFound(path);
      }

      return json(metrics);
    }

    const upsellExplanationAddress = toUpsellExplanationAddress(path);
    if (upsellExplanationAddress !== null) {
      const normalizedAddress = normalizePaymentRecipientAddress(upsellExplanationAddress);
      const metrics = resolvedDataSource.getCustomerUpsellMetrics(normalizedAddress);

      if (!metrics) {
        return notFound(path);
      }

      if (!llmService) {
        return llmUnavailable();
      }

      try {
        return json(await llmService.generateUpsellExplanation(metrics));
      } catch (error) {
        console.error("Bedrock upsell explanation request failed.", error);
        return llmFailed(error);
      }
    }

    const workflowIntentAddress = toWorkflowIntentAddress(path);
    if (workflowIntentAddress !== null) {
      const normalizedAddress = normalizePaymentRecipientAddress(workflowIntentAddress);
      const profile = resolvedDataSource.getCustomerProfile(normalizedAddress);

      if (!profile) {
        return notFound(path);
      }

      const selection = buildWorkflowIntentInputFromProfile(profile);
      const input = toWorkflowIntentInput(selection);

      if (!input) {
        return json(
          validatePhaseBCustomerWorkflowIntentResponse({
            generatedAt: new Date().toISOString(),
            generatedFrom: WORKFLOW_INTENT_GENERATED_FROM,
            address: normalizedAddress,
            sourceGeneratedAt: profile.generatedAt,
            sessionWindowSeconds: selection.sessionWindowSeconds,
            sessionCount: selection.sessionCount,
            remainingSessionCount: selection.remainingSessionCount,
            analysisStatus: "no_candidate_sessions",
            model: null,
            input: null,
            explanations: [],
            sessions: selection.sessions,
            failureMessage: null,
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              input: "derived_insight",
              sessions: "derived_insight",
            },
            reasons: [workflowIntentReason],
          }),
        );
      }

      if (!llmService) {
        return json(
          validatePhaseBCustomerWorkflowIntentResponse({
            generatedAt: new Date().toISOString(),
            generatedFrom: WORKFLOW_INTENT_GENERATED_FROM,
            address: normalizedAddress,
            sourceGeneratedAt: profile.generatedAt,
            sessionWindowSeconds: selection.sessionWindowSeconds,
            sessionCount: selection.sessionCount,
            remainingSessionCount: selection.remainingSessionCount,
            analysisStatus: "unavailable",
            model: null,
            input,
            explanations: [],
            sessions: selection.sessions,
            failureMessage: null,
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              input: "derived_insight",
              sessions: "derived_insight",
            },
            reasons: [workflowIntentReason],
          }),
        );
      }

      try {
        const result = await llmService.generateWorkflowIntentExplanation({
          address: normalizedAddress,
          sourceGeneratedAt: profile.generatedAt,
          input,
        });

        return json(
          validatePhaseBCustomerWorkflowIntentResponse({
            generatedAt: new Date().toISOString(),
            generatedFrom: WORKFLOW_INTENT_GENERATED_FROM,
            address: normalizedAddress,
            sourceGeneratedAt: profile.generatedAt,
            sessionWindowSeconds: selection.sessionWindowSeconds,
            sessionCount: selection.sessionCount,
            remainingSessionCount: selection.remainingSessionCount,
            analysisStatus: "ready",
            model: result.model,
            input,
            explanations: result.explanations,
            sessions: selection.sessions,
            failureMessage: null,
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              model: "derived_insight",
              input: "derived_insight",
              explanations: "derived_insight",
              sessions: "derived_insight",
            },
            reasons: [workflowIntentReason],
          }),
        );
      } catch (error) {
        console.error("Workflow intent request failed.", error);
        return json(
          validatePhaseBCustomerWorkflowIntentResponse({
            generatedAt: new Date().toISOString(),
            generatedFrom: WORKFLOW_INTENT_GENERATED_FROM,
            address: normalizedAddress,
            sourceGeneratedAt: profile.generatedAt,
            sessionWindowSeconds: selection.sessionWindowSeconds,
            sessionCount: selection.sessionCount,
            remainingSessionCount: selection.remainingSessionCount,
            analysisStatus: "failed",
            model: null,
            input,
            explanations: [],
            sessions: selection.sessions,
            failureMessage:
              error instanceof BffLlmInferenceError
                ? error.message
                : error instanceof Error && error.message
                  ? error.message
                  : "Workflow intent explanation inference failed.",
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              input: "derived_insight",
              sessions: "derived_insight",
            },
            reasons: [workflowIntentReason],
          }),
        );
      }
    }

    return notFound(path);
  };

const notFound = (path: string) =>
  json({ error: "not_found", message: `Route not found: ${path}` }, { status: 404 });
