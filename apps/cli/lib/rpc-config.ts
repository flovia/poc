export type RpcEnv = {
  BASE_RPC_URL?: string;
  ALCHEMY_API_KEY?: string;
  RPC_REQUEST_TIMEOUT_MS?: string;
};

export const buildAlchemyBaseRpcUrl = (apiKey: string) => `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;

export const resolveBaseRpcUrl = (env: RpcEnv = process.env as RpcEnv) => {
  const explicitUrl = env.BASE_RPC_URL?.trim();
  if (explicitUrl) return explicitUrl;

  const alchemyApiKey = env.ALCHEMY_API_KEY?.trim();
  if (alchemyApiKey) return buildAlchemyBaseRpcUrl(alchemyApiKey);

  throw new Error("BASE_RPC_URL or ALCHEMY_API_KEY is required");
};

export const resolveRpcRequestTimeoutMs = (env: RpcEnv = process.env as RpcEnv) => {
  const value = Number(env.RPC_REQUEST_TIMEOUT_MS ?? 30_000);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("RPC_REQUEST_TIMEOUT_MS must be a positive integer");
  return value;
};
