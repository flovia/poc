import fs from "node:fs";
import path from "node:path";
import { validateEndpointManifest, type RouteKind } from "../lib/endpoint-manifest";

type Snapshot = {
  services: ServiceSnapshotRecord[];
};

type ServiceSnapshotRecord = {
  slug: string;
  serviceUrl: string;
  detail: ServiceDetail | null;
};

type ServiceDetail = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  paymentsProtocolConfig?: PaymentRoute[];
  openapiSpec?: unknown;
  endpoints?: CatalogEndpoint[];
};

type PaymentRoute = {
  baseUrl?: string;
  networks?: string[];
  protocol?: string;
};

type CatalogEndpoint = {
  id?: string;
  serviceId?: string;
  httpMethod?: string;
  path?: string;
  description?: string;
  parameters?: string | null;
  instructions?: string | null;
  price?: string | null;
  currency?: string | null;
  updatedAt?: string;
};

const SPONGE_CATALOG_SOURCE_URL = "https://api.catalog.paysponge.com/api/services";
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const snapshotPath = () =>
  path.join(process.cwd(), "fixtures", "acquisition", "sponge_catalog_snapshot.json");

const manifestPath = () => path.join(process.cwd(), "fixtures", "acquisition", "endpoint_manifest.json");

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

const parseParameters = (value: string | null | undefined): unknown => {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const hasRequestBodySchema = (parameters: unknown): boolean => {
  if (typeof parameters !== "object" || parameters === null) return false;
  return "body" in parameters;
};

const hasPathParams = (sourcePath: string): boolean => /[{:]\w/.test(sourcePath);

const hasQueryParams = (parameters: unknown): boolean => {
  if (typeof parameters !== "object" || parameters === null) return false;
  return "query" in parameters;
};

const routeKind = (route: PaymentRoute): RouteKind => {
  const baseUrl = route.baseUrl ?? "";
  const host = baseUrl.length > 0 ? new URL(baseUrl).host : "";
  const protocol = route.protocol ?? "";

  if (protocol === "x402" && host.endsWith("paysponge.com")) return "sponge_wrapper_x402";
  if (protocol === "x402") return "provider_direct_x402";
  if (protocol === "mpp" && host.endsWith("paywithlocus.com")) return "locus_wrapper_mpp";
  if (protocol === "mpp" && host.endsWith("mpp.tempo.xyz")) return "tempo_mpp";
  return "other";
};

const primaryNetwork = (route: PaymentRoute): string => {
  const networks = route.networks ?? [];
  return networks.includes("base") ? "base" : (networks[0] ?? "unknown");
};

const expectedAsset = (endpoint: CatalogEndpoint, route: PaymentRoute): string =>
  endpoint.currency === "USDC" && primaryNetwork(route) === "base"
    ? BASE_USDC_ADDRESS
    : String(endpoint.currency ?? "unknown");

const joinUrl = (baseUrl: string, endpointPath: string): string =>
  `${baseUrl.replace(/\/$/, "")}/${endpointPath.replace(/^\//, "")}`;

const cleanExamplePath = (value: string): string =>
  value
    .trim()
    .replace(/[),.;]+$/, "")
    .replace(/^`|`$/g, "");

const extractExamplePath = (instructions: string | null | undefined): string | null => {
  if (!instructions) return null;

  const match = instructions.match(/(?:example|e\.g\.)\s*:?\s*(`?https?:\/\/\S+`?|`?\/\S+`?)/i);
  if (!match?.[1]) return null;

  const example = cleanExamplePath(match[1]);
  return example.startsWith("http://") || example.startsWith("https://") || example.startsWith("/")
    ? example
    : null;
};

const resolveExampleUrl = (baseUrl: string, examplePath: string | null): string | null => {
  if (!examplePath) return null;
  if (examplePath.startsWith("http://") || examplePath.startsWith("https://")) return examplePath;
  return joinUrl(baseUrl, examplePath);
};

const isSupportedMethod = (method: string): method is "GET" | "POST" | "DELETE" | "PATCH" | "PUT" =>
  method === "GET" || method === "POST" || method === "DELETE" || method === "PATCH" || method === "PUT";

const probeState = (
  method: string,
  sourcePath: string,
  parameters: unknown,
  concreteResourceUrl: string | null,
) => {
  const reasons: string[] = [];

  if (method !== "GET" && method !== "POST") {
    return { probeReadiness: "unsupported_method" as const, reasons: [`unsupported method: ${method}`] };
  }

  if (hasPathParams(sourcePath) && concreteResourceUrl === null) {
    reasons.push("path parameters require examples");
  }
  if (method === "GET" && hasQueryParams(parameters) && concreteResourceUrl === null) {
    reasons.push("query parameters require examples");
  }
  if (method === "POST") {
    if (!hasRequestBodySchema(parameters)) reasons.push("request body schema/example missing");
    else reasons.push("request body template requires review");
  }

  return {
    probeReadiness: reasons.length === 0 ? ("ready" as const) : ("needs_request_params" as const),
    reasons,
  };
};

const buildCatalogCases = (snapshot: Snapshot) => {
  const cases: Array<Record<string, unknown>> = [];

  for (const service of snapshot.services) {
    const detail = service.detail;
    if (!detail) continue;

    const routes = detail.paymentsProtocolConfig ?? [];
    const endpoints = detail.endpoints ?? [];

    for (const [routeIndex, route] of routes.entries()) {
      if (!route.baseUrl || !route.protocol || !route.networks || route.networks.length < 1) continue;

      const requestHost = new URL(route.baseUrl).host;
      for (const endpoint of endpoints) {
        const method = String(endpoint.httpMethod ?? "GET").toUpperCase();
        if (!isSupportedMethod(method)) continue;

        const sourcePath = String(endpoint.path ?? "");
        if (sourcePath.length < 1) continue;

        const requestParameters = parseParameters(endpoint.parameters);
        const endpointUrl = joinUrl(route.baseUrl, sourcePath);
        const exampleUrl = method === "GET" ? resolveExampleUrl(route.baseUrl, extractExamplePath(endpoint.instructions)) : null;
        const concreteResourceUrl =
          exampleUrl ?? (!hasPathParams(sourcePath) && !hasQueryParams(requestParameters) ? endpointUrl : null);
        const { probeReadiness, reasons } = probeState(
          method,
          sourcePath,
          requestParameters,
          concreteResourceUrl,
        );
        const sourceNetworks = route.networks;

        cases.push({
          caseId: `spcat-${service.slug}-${endpoint.id ?? "endpoint"}-route-${routeIndex}`,
          entityId: service.slug,
          providerName: detail.name ?? service.slug,
          serviceName: endpoint.description ?? detail.name ?? service.slug,
          endpointUrl,
          ...(concreteResourceUrl !== null ? { resourceUrl: concreteResourceUrl } : {}),
          requestHost,
          method,
          ...(requestParameters === undefined ? {} : { requestParameters }),
          ...(hasRequestBodySchema(requestParameters) ? { requestBodySchema: requestParameters } : {}),
          sourceName: "sponge_catalog",
          sourceUrl: service.serviceUrl || SPONGE_CATALOG_SOURCE_URL,
          sourceObservedDate: String(endpoint.updatedAt ?? new Date().toISOString()).slice(0, 10),
          sourceServiceId: detail.id ?? endpoint.serviceId,
          sourceEndpointId: endpoint.id,
          sourceEndpointUpdatedAt: endpoint.updatedAt,
          sourceBaseUrl: route.baseUrl,
          sourcePath,
          sourceProtocol: route.protocol,
          sourceNetworks,
          routeKind: routeKind(route),
          probeReadiness,
          ...(reasons.length > 0 ? { probeBlockedReasons: reasons } : {}),
          discoveryMethod: "catalog",
          expectedNetwork: primaryNetwork(route),
          expectedAsset: expectedAsset(endpoint, route),
        });
      }
    }
  }

  return cases.sort((left, right) => String(left.caseId).localeCompare(String(right.caseId)));
};

const run = () => {
  const snapshot = readJson<Snapshot>(snapshotPath());
  const currentManifest = readJson<{ cases: Array<Record<string, unknown>> }>(manifestPath());
  const nonSpongeCases = currentManifest.cases.filter((entry) => entry.sourceName !== "sponge_catalog");
  const spongeCases = buildCatalogCases(snapshot);
  const nextManifest = {
    schemaVersion: "1",
    cases: [...spongeCases, ...nonSpongeCases],
  };

  validateEndpointManifest(nextManifest);
  fs.writeFileSync(manifestPath(), `${JSON.stringify(nextManifest, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        spongeCaseCount: spongeCases.length,
        nonSpongeCaseCount: nonSpongeCases.length,
        totalCaseCount: nextManifest.cases.length,
      },
      null,
      2,
    ),
  );
};

run();
