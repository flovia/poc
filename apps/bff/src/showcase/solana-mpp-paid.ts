import crypto from "node:crypto";
import { Mppx, solana } from "@solana/mpp/server";
import { flovia, json } from "./flovia-track-paid-api";

const endpoint = "/showcase/solana-mpp/paid";
const provider = "solana" as const;
const rail = "mpp" as const;

// Display amount (UI/Flovia event metadata).
const displayAmount = "0.10";
const displayCurrency = "usdc";

// Protocol-level values handed to `mppx.charge({...})`. These must match the
// Solana MPP SPL token mint and base-unit amount, not the display strings above.
const USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const decimals = 6;
const baseUnitsAmount = toBaseUnits(displayAmount, decimals);

const ALLOWED_NETWORKS = ["devnet", "localnet", "mainnet-beta"] as const;
type SolanaNetwork = (typeof ALLOWED_NETWORKS)[number];

function toBaseUnits(amount: string, dec: number): string {
  const [whole, fraction = ""] = amount.split(".");
  if (whole === undefined || /[^0-9]/.test(whole) || /[^0-9]/.test(fraction)) {
    throw new Error(`Invalid Solana MPP amount: ${amount}`);
  }
  const padded = (fraction + "0".repeat(dec)).slice(0, dec);
  const combined = `${whole}${padded}`.replace(/^0+(?=\d)/, "");
  return combined === "" ? "0" : combined;
}

function resolveNetwork(): SolanaNetwork {
  const raw = envValue("SOLANA_MPP_NETWORK");
  if (!raw) return "devnet";
  if ((ALLOWED_NETWORKS as readonly string[]).includes(raw)) return raw as SolanaNetwork;
  throw new Error(
    `Invalid SOLANA_MPP_NETWORK="${raw}". Expected one of: ${ALLOWED_NETWORKS.join(", ")}.`,
  );
}

const envValue = (key: string) => {
  const value = process.env[key]?.trim();
  return value ? value : null;
};

const buildSolanaMppx = (recipient: string, network: SolanaNetwork) => {
  const mint = envValue("SOLANA_MPP_CURRENCY") ?? USDC_DEVNET_MINT;
  return Mppx.create({
    secretKey: envValue("SOLANA_MPP_SECRET_KEY") ?? crypto.randomBytes(32).toString("base64"),
    methods: [
      solana.charge({
        recipient,
        currency: mint,
        decimals,
        network,
      }),
    ],
  });
};

let cachedMppx: ReturnType<typeof buildSolanaMppx> | null = null;
let cachedRecipient: string | null = null;
let cachedNetwork: SolanaNetwork | null = null;

const resolveSolanaMppx = (network: SolanaNetwork) => {
  const recipient = envValue("SOLANA_MPP_RECIPIENT");
  if (!recipient) return null;
  if (cachedMppx && cachedRecipient === recipient && cachedNetwork === network) {
    return { mppx: cachedMppx, recipient };
  }
  cachedMppx = buildSolanaMppx(recipient, network);
  cachedRecipient = recipient;
  cachedNetwork = network;
  return { mppx: cachedMppx, recipient };
};

export const handleSolanaMppPaidShowcase = (request: Request) =>
  flovia.trackPaidApi(request, {
    provider,
    rail,
    endpoint,
    amount: displayAmount,
    currency: displayCurrency,
    handler: async ({ requestId, attachPaymentContext }) => {
      let network: SolanaNetwork;
      try {
        network = resolveNetwork();
      } catch (error) {
        return json(
          {
            error: "solana_mpp_invalid_network",
            message: error instanceof Error ? error.message : "Invalid SOLANA_MPP_NETWORK value.",
            allowedEnv: { SOLANA_MPP_NETWORK: ALLOWED_NETWORKS },
            floviaEvent: {
              status: "configuration_invalid",
              responseStatus: 503,
              payment: { provider, rail, amount: displayAmount, currency: displayCurrency },
              joinedInsight:
                "Solana MPP showcase rejected an unknown network value before reaching the broker.",
            },
          },
          { status: 503 },
        );
      }

      const resolved = resolveSolanaMppx(network);

      if (!resolved) {
        return json(
          {
            error: "solana_mpp_not_configured",
            message: `Set SOLANA_MPP_RECIPIENT to enable the real Solana MPP showcase flow on ${network}.`,
            requiredEnv: ["SOLANA_MPP_RECIPIENT"],
            optionalEnv: ["SOLANA_MPP_NETWORK", "SOLANA_MPP_CURRENCY", "SOLANA_MPP_SECRET_KEY"],
            floviaEvent: {
              status: "configuration_required",
              responseStatus: 503,
              payment: {
                provider,
                rail,
                network: `solana-${network}`,
                amount: displayAmount,
                currency: displayCurrency,
              },
              joinedInsight: `Live Solana MPP requires a ${network} recipient before Flovia can join real Solana payment context.`,
            },
          },
          { status: 503 },
        );
      }

      const mint = envValue("SOLANA_MPP_CURRENCY") ?? USDC_DEVNET_MINT;
      const result = await resolved.mppx.solana.charge({
        amount: baseUnitsAmount,
        currency: mint,
      })(request);

      if (result.status === 402) return result.challenge;

      // For Solana, the per-payment identifier is the on-chain transaction
      // signature, which the MPP receipt header carries. The frontend reads
      // it from the receipt and surfaces it in both the "Tx signature" and
      // "Payment id" rows so we do not need to invent a server-side id here.
      attachPaymentContext({
        provider,
        rail,
        network: `solana-${network}`,
        amount: displayAmount,
        currency: displayCurrency,
        mint,
        recipient: resolved.recipient,
      });

      return result.withReceipt(
        Response.json({
          ok: true,
          foo: "bar",
          provider,
          paidApi: {
            endpoint,
            message: "Solana MPP showcase paid response",
            generatedAt: new Date().toISOString(),
          },
          floviaEvent: {
            requestId,
            provider,
            rail,
            endpoint,
            method: request.method,
            responseStatus: 200,
            status: "paid_api_delivered",
            payment: {
              provider,
              rail,
              network: `solana-${network}`,
              amount: displayAmount,
              currency: displayCurrency,
              mint,
              recipient: resolved.recipient,
            },
            apiUsage: { endpoint, method: request.method, responseStatus: 200 },
            joinedInsight:
              "Solana SPL token payment context converted into retained paid API demand.",
          },
        }),
      );
    },
  });
