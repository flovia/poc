import type { CollectorServiceId, SupportedChain } from "./types.js";

export type CollectorServiceDefinition = {
  id: CollectorServiceId;
  label: string;
  role: string;
  supportedChains: readonly SupportedChain[];
  requiredEnv: readonly string[];
  notes: readonly string[];
};

export type CollectorCredentialStatus = {
  serviceId: CollectorServiceId;
  available: boolean;
  missing: string[];
  values: Record<string, string>;
};

export const RPC_FAST_SOLANA_RPC_URL = "https://solana-rpc.rpcfast.com/";

export const supportedCollectorServiceIds = [
  "alchemy",
  "rpc-fast",
  "dune-sim",
  "goldrush",
  "coingecko",
  "nansen",
] as const satisfies readonly CollectorServiceId[];

export const collectorServiceDefinitions: Record<CollectorServiceId, CollectorServiceDefinition> = {
  alchemy: {
    id: "alchemy",
    label: "Alchemy",
    role: "Default Base and Solana collection path for the next implementation phase.",
    supportedChains: ["base", "solana"],
    requiredEnv: ["ALCHEMY_API_KEY"],
    notes: [
      "Construct Base JSON-RPC endpoints from the API key for alchemy_getAssetTransfers or eth_getLogs evaluation.",
      "Construct Solana JSON-RPC endpoints from the API key for getSignaturesForAddress and getTransaction evaluation.",
    ],
  },
  "rpc-fast": {
    id: "rpc-fast",
    label: "RPC Fast",
    role: "Alternative low-latency Solana RPC provider to compare with Alchemy-backed polling.",
    supportedChains: ["solana"],
    requiredEnv: ["RPC_FAST_API_KEY"],
    notes: [
      `Use the fixed Solana endpoint ${RPC_FAST_SOLANA_RPC_URL} and pass the API key separately.`,
    ],
  },
  "dune-sim": {
    id: "dune-sim",
    label: "Dune Sim",
    role: "Indexed activity and transaction API comparison, not the main Dune analytics product.",
    supportedChains: ["base", "solana"],
    requiredEnv: ["DUNE_SIM_API_KEY"],
    notes: ["Use X-Sim-Api-Key during tmp evaluation; compare pagination and normalized output."],
  },
  goldrush: {
    id: "goldrush",
    label: "GoldRush",
    role: "Historical transfer/activity API comparison for Base and possible Solana support.",
    supportedChains: ["base", "solana"],
    requiredEnv: ["GOLDRUSH_API_KEY"],
    notes: [
      "Prefer header/basic auth during tmp evaluation; avoid credentials in URLs when possible.",
    ],
  },
  coingecko: {
    id: "coingecko",
    label: "CoinGecko",
    role: "Token price enrichment paired with Solana RPC token-account balance reads.",
    supportedChains: ["solana"],
    requiredEnv: ["COINGECKO_API_KEY"],
    notes: [
      "CoinGecko does not expose wallet balances; use it to price balances fetched from Solana RPC.",
    ],
  },
  nansen: {
    id: "nansen",
    label: "Nansen",
    role: "Current address balance enrichment for Solana provider wallets.",
    supportedChains: ["solana"],
    requiredEnv: ["NANSEN_API_KEY"],
    notes: ["Use the profiler address current-balance endpoint and filter by exact Solana mint."],
  },
};

export function loadCollectorCredentials(
  env: Record<string, string | undefined>,
): Record<CollectorServiceId, CollectorCredentialStatus> {
  return Object.fromEntries(
    supportedCollectorServiceIds.map((serviceId) => {
      const definition = collectorServiceDefinitions[serviceId];
      const values = Object.fromEntries(
        definition.requiredEnv.flatMap((name) => {
          const value = env[name]?.trim();
          return value ? [[name, value]] : [];
        }),
      );
      const missing = definition.requiredEnv.filter((name) => !values[name]);
      return [
        serviceId,
        {
          serviceId,
          available: missing.length === 0,
          missing,
          values,
        },
      ];
    }),
  ) as Record<CollectorServiceId, CollectorCredentialStatus>;
}

export function collectorCredentialTemplate(): string {
  const lines = [
    "# tmp/collector-evaluation/.env",
    "# Local-only credentials for collector API validation.",
    "# Do not commit this file or copy secrets into docs/worklogs.",
    "",
  ];

  for (const serviceId of supportedCollectorServiceIds) {
    const definition = collectorServiceDefinitions[serviceId];
    lines.push(`# ${definition.label}`);
    for (const envName of definition.requiredEnv) {
      lines.push(`${envName}=`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
