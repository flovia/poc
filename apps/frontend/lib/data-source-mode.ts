export type FrontendDataSource = "fixture" | "bff";

export const FRONTEND_DATA_SOURCE_ENV = "FLOVIA_FRONTEND_DATA_SOURCE";
export const PUBLIC_FRONTEND_DATA_SOURCE_ENV = "NEXT_PUBLIC_FLOVIA_DATA_SOURCE";

type Env = Record<string, string | undefined>;

function readExplicitSource(env: Env): FrontendDataSource | null {
  const raw = (env[PUBLIC_FRONTEND_DATA_SOURCE_ENV] ?? env[FRONTEND_DATA_SOURCE_ENV])?.trim();
  if (raw === "fixture" || raw === "bff") return raw;
  return null;
}

export function resolveFrontendDataSource(env: Env = process.env): FrontendDataSource {
  return readExplicitSource(env) ?? "fixture";
}

export function isFixtureDataSource(env: Env = process.env): boolean {
  return resolveFrontendDataSource(env) === "fixture";
}

export function shouldProxyBff(env: Env = process.env): boolean {
  return !isFixtureDataSource(env);
}

export function bffProxyDestination(env: Env = process.env): string {
  return `${(env.BFF_URL ?? "http://localhost:3001").replace(/\/$/, "")}/:path*`;
}
