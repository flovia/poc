import { normalizePaymentRecipientAddress } from "contracts";
import { type BffAnalyticsDataSource, resolveAnalyticsDataSource } from "./data/analytics-source";
import { BffLlmUnavailableError, type BffLlmService, resolveBffLlmService } from "./data/llm";
import { buildWorkflowIntentInputFromProfile, toWorkflowIntentInput } from "./data/workflow-intent";
import {
  json,
  badRequest,
  cachedJson,
  llmFailed,
  llmUnavailable,
  methodNotAllowed,
  notFound,
  workflowIntentFailed,
  workflowIntentNoCandidateSessions,
  workflowIntentReady,
  workflowIntentUnavailable,
} from "./http/responses";
import { matchCustomerRoute, normalizePath, readonlyRoutes } from "./http/routes";
import { buildProviderRanking, parseProviderRankingQuery } from "./data/provider-ranking";
import { handleShowcaseRoute, showcaseRoutes } from "./showcase";

type RequestTimeoutController = {
  timeout(request: Request, seconds: number): void;
};
type RuntimeEnv = NodeJS.ProcessEnv;
export type BffRuntimeMetadata = {
  commitHash: string | null;
  startedAt: string;
  startedAtMs: number;
};

const COMMIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/i;

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
  startedAtMs: now.getTime(),
});

export const createBffHandler = (
  dataSource: BffAnalyticsDataSource | Promise<BffAnalyticsDataSource> | undefined = undefined,
  llmService: BffLlmService | null = resolveBffLlmService(),
  runtimeMetadata: BffRuntimeMetadata = resolveBffRuntimeMetadata(),
) => {
  let resolvedDataSource = dataSource;
  const getDataSource = () => {
    resolvedDataSource ??= resolveAnalyticsDataSource();
    return resolvedDataSource;
  };

  return async (request: Request, server?: RequestTimeoutController) => {
    const url = new URL(request.url);
    const path = normalizePath(url);
    const customerRoute = matchCustomerRoute(path);

    if (request.method !== "GET") {
      if (
        request.method === "POST" &&
        (path === "/showcase/stripe-mpp/pay" || path === "/showcase/solana-mpp/pay")
      ) {
        return handleShowcaseRoute(request, path) ?? notFound(path);
      }

      if (readonlyRoutes.has(path) || showcaseRoutes.has(path) || customerRoute !== null) {
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
          uptimeSeconds: Math.max(0, Math.floor((Date.now() - runtimeMetadata.startedAtMs) / 1000)),
        });
      default:
        break;
    }

    const showcaseResponse = handleShowcaseRoute(request, path);
    if (showcaseResponse) return showcaseResponse;

    const activeDataSource = await getDataSource();

    switch (path) {
      case "/providers":
        return cachedJson(activeDataSource.providers);
      case "/customers": {
        const serviceId = url.searchParams.get("serviceId");
        if (serviceId) {
          return cachedJson(activeDataSource.getCustomersByServiceId(serviceId));
        }
        return cachedJson(
          activeDataSource.getCustomers(url.searchParams.get("payTo") ?? undefined),
        );
      }
      case "/wallet-usage-graph":
        return cachedJson(activeDataSource.walletUsageGraph);
      case "/analytics/services/coingecko/summary":
        return cachedJson(activeDataSource.serviceSummary);
      case "/analytics/services/comparison":
        return cachedJson(activeDataSource.serviceComparison);
      case "/analytics/services/quadrants":
        return cachedJson(activeDataSource.serviceQuadrants);
      case "/analytics/providers/ranking": {
        try {
          return cachedJson(
            buildProviderRanking(
              activeDataSource.providers,
              parseProviderRankingQuery(url.searchParams),
            ),
          );
        } catch (error) {
          return badRequest(
            error instanceof Error ? error.message : "Invalid provider ranking query.",
          );
        }
      }
      case "/analytics/routes/summary":
        return cachedJson(activeDataSource.routeSummary);
      case "/analytics/routes/sankey":
        return cachedJson(activeDataSource.routeSankey);
      default:
        break;
    }

    if (customerRoute?.kind === "profile") {
      const normalizedAddress = normalizePaymentRecipientAddress(customerRoute.address);
      const profile = activeDataSource.getCustomerProfile(normalizedAddress);

      if (!profile) {
        return notFound(path);
      }

      return cachedJson(profile);
    }

    if (customerRoute?.kind === "intelligence") {
      const normalizedAddress = normalizePaymentRecipientAddress(customerRoute.address);
      const intelligence = activeDataSource.getCustomerIntelligence(normalizedAddress);

      if (!intelligence) {
        return notFound(path);
      }

      return cachedJson(intelligence);
    }

    if (customerRoute?.kind === "upsellMetrics") {
      const normalizedAddress = normalizePaymentRecipientAddress(customerRoute.address);
      const metrics = activeDataSource.getCustomerUpsellMetrics(normalizedAddress);

      if (!metrics) {
        return notFound(path);
      }

      return cachedJson(metrics);
    }

    if (customerRoute?.kind === "upsellExplanation") {
      const normalizedAddress = normalizePaymentRecipientAddress(customerRoute.address);
      const metrics = activeDataSource.getCustomerUpsellMetrics(normalizedAddress);

      if (!metrics) {
        return notFound(path);
      }

      if (!llmService) {
        return llmUnavailable();
      }

      try {
        // QVAC may need to download and load a local model on the first request.
        server?.timeout(request, 0);
        return json(await llmService.generateUpsellExplanation(metrics));
      } catch (error) {
        if (error instanceof BffLlmUnavailableError) {
          return llmUnavailable();
        }
        console.error("LLM upsell explanation request failed.", error);
        return llmFailed(error);
      }
    }

    if (customerRoute?.kind === "workflowIntent") {
      const normalizedAddress = normalizePaymentRecipientAddress(customerRoute.address);
      const profile = activeDataSource.getCustomerProfile(normalizedAddress);

      if (!profile) {
        return notFound(path);
      }

      const selection = buildWorkflowIntentInputFromProfile(profile);
      const input = toWorkflowIntentInput(selection);

      if (!input) {
        return workflowIntentNoCandidateSessions({
          address: normalizedAddress,
          profile,
          selection,
          input,
        });
      }

      const unavailableResponse = () =>
        workflowIntentUnavailable({ address: normalizedAddress, profile, selection, input });

      if (!llmService) {
        return unavailableResponse();
      }

      try {
        server?.timeout(request, 0);
        const result = await llmService.generateWorkflowIntentExplanation({
          address: normalizedAddress,
          sourceGeneratedAt: profile.generatedAt,
          input,
        });

        return workflowIntentReady({
          address: normalizedAddress,
          profile,
          selection,
          input,
          result,
        });
      } catch (error) {
        if (error instanceof BffLlmUnavailableError) {
          return unavailableResponse();
        }
        console.error("Workflow intent request failed.", error);
        return workflowIntentFailed({
          address: normalizedAddress,
          profile,
          selection,
          input,
          error,
        });
      }
    }

    return notFound(path);
  };
};
