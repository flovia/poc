export type ServerDataSource = "bff" | "fixture";
export type ServerDataSourceSetting = ServerDataSource | "auto";
type Env = Record<string, string | undefined>;

const LOCAL_BFF_URL = "http://localhost:3001";

function isDeployLikeEnv(env: Env): boolean {
  return env.NODE_ENV === "production" || env.VERCEL === "1";
}

function isLocalhostUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function readServerDataSourceSetting(env: Env = process.env): ServerDataSourceSetting {
  const raw = env.FRONTEND_DATA_SOURCE;
  if (raw === undefined || raw === "") return "auto";
  if (raw === "auto" || raw === "bff" || raw === "fixture") return raw;
  throw new Error(
    `Invalid FRONTEND_DATA_SOURCE=${JSON.stringify(raw)}. Expected "auto", "bff", or "fixture".`,
  );
}

export function resolveServerDataSource(env: Env = process.env): ServerDataSource {
  const setting = readServerDataSourceSetting(env);
  if (setting !== "auto") return setting;

  if (env.BFF_URL) return "bff";
  if (isDeployLikeEnv(env)) return "fixture";
  return "bff";
}

export function resolveServerBffBaseUrl(env: Env = process.env): string {
  const raw = env.BFF_URL ?? LOCAL_BFF_URL;
  const deployLike = isDeployLikeEnv(env);

  if (deployLike && !env.BFF_URL) {
    throw new Error(
      "BFF_URL is required when FRONTEND_DATA_SOURCE=bff in production/Vercel. " +
        'Set BFF_URL to a public BFF endpoint or use FRONTEND_DATA_SOURCE="fixture".',
    );
  }

  if (deployLike && isLocalhostUrl(raw)) {
    throw new Error(
      `BFF_URL must not point to localhost in production/Vercel: ${raw}. ` +
        'Set BFF_URL to a public BFF endpoint or use FRONTEND_DATA_SOURCE="fixture".',
    );
  }

  return raw.replace(/\/$/, "");
}
