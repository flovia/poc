export type ProviderKey = "stripe" | "hitpay" | "solana";
export type LiveState = "idle" | "calling" | "challenge" | "paid" | "error";

export type LiveResult = {
  status: number;
  body: unknown;
};

export function getChallengeId(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("challenge" in body)) return null;
  const challenge = (body as { challenge?: unknown }).challenge;
  if (typeof challenge !== "object" || challenge === null) return null;
  const challengeId =
    (challenge as { challengeId?: unknown; id?: unknown }).challengeId ??
    (challenge as { id?: unknown }).id;
  return typeof challengeId === "string" ? challengeId : null;
}

export function extractHitPayCheckoutUrl(challenge: unknown): string | null {
  if (typeof challenge !== "object" || challenge === null) return null;
  const methodDetails = (challenge as { methodDetails?: unknown }).methodDetails;
  if (typeof methodDetails !== "object" || methodDetails === null) return null;
  const checkoutUrl =
    (methodDetails as { checkout_url?: unknown; checkoutUrl?: unknown }).checkout_url ??
    (methodDetails as { checkoutUrl?: unknown }).checkoutUrl;
  return typeof checkoutUrl === "string" ? checkoutUrl : null;
}

export async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function parsePaymentReceiptHeader(header: string | null): Record<string, unknown> | null {
  if (!header) return null;

  try {
    const normalized = header.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const receipt = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return asRecord(receipt);
  } catch {
    return null;
  }
}

export function attachReceiptToBody(body: unknown, receipt: Record<string, unknown> | null) {
  if (!receipt) return body;
  const bodyRecord = asRecord(body);
  if (bodyRecord) return { ...bodyRecord, receipt };
  return { response: body, receipt };
}

export function tempoReceiptExplorerUrl(txHash: string) {
  return `https://explore.testnet.tempo.xyz/receipt/${encodeURIComponent(txHash)}`;
}

export function solanaTxExplorerUrl(signature: string, network: string = "devnet") {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${encodeURIComponent(network)}`;
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}${cluster}`;
}

export function networkFromSolanaPaymentContext(
  payment: Record<string, unknown> | null | undefined,
): string {
  const value = stringValue(payment?.network);
  if (!value) return "devnet";
  return value.startsWith("solana-") ? value.slice("solana-".length) : value;
}

export function extractLiveResultFacts(
  result: LiveResult | null,
  provider: ProviderKey = "stripe",
) {
  const body = asRecord(result?.body);
  const response = asRecord(body?.response);
  const floviaEvent = asRecord(body?.floviaEvent) ?? asRecord(response?.floviaEvent);
  const apiUsage = asRecord(floviaEvent?.apiUsage);
  const payment = asRecord(floviaEvent?.payment);
  const receipt = asRecord(body?.receipt);
  const receiptReference = stringValue(receipt?.reference);
  const hitPayPaymentId = firstNestedString(
    [receipt, payment, body, response],
    ["chargeId", "charge_id", "paymentId", "payment_id", "checkoutId", "checkout_id", "id"],
  );

  return {
    paymentId:
      provider === "hitpay"
        ? hitPayPaymentId
        : provider === "solana"
          ? // For Solana, the per-payment identifier is the on-chain tx
            // signature (carried in the receipt). Fall back to nested ids only
            // if the receipt is unavailable.
            (stringValue(payment?.paymentId) ?? receiptReference ?? hitPayPaymentId)
          : (stringValue(payment?.paymentIntentId) ?? stringValue(payment?.paymentId)),
    txHash: provider === "stripe" ? receiptReference : null,
    txSignature: provider === "solana" ? receiptReference : null,
    receiptId: provider === "hitpay" ? receiptReference : null,
    requestId: stringValue(floviaEvent?.requestId),
    status: stringValue(floviaEvent?.status),
    rail: stringValue(floviaEvent?.rail) ?? stringValue(payment?.rail),
    amount: stringValue(floviaEvent?.amount) ?? stringValue(payment?.amount),
    currency: stringValue(floviaEvent?.currency) ?? stringValue(payment?.currency),
    network: provider === "solana" ? networkFromSolanaPaymentContext(payment) : null,
    endpoint: stringValue(apiUsage?.endpoint) ?? stringValue(floviaEvent?.endpoint),
    method: stringValue(apiUsage?.method) ?? stringValue(floviaEvent?.method),
    responseStatus:
      stringValue(apiUsage?.responseStatus) ?? stringValue(floviaEvent?.responseStatus),
    latencyMs: stringValue(apiUsage?.latencyMs) ?? stringValue(floviaEvent?.latencyMs),
  };
}

export function firstNestedString(
  records: Array<Record<string, unknown> | null>,
  keys: readonly string[],
) {
  for (const record of records) {
    const value = nestedString(record, keys, 0);
    if (value) return value;
  }
  return null;
}

export function nestedString(
  value: unknown,
  keys: readonly string[],
  depth: number,
): string | null {
  if (!value || depth > 3) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = nestedString(item, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;

  for (const key of keys) {
    const direct = stringValue(record[key]);
    if (direct) return direct;
  }

  for (const nested of Object.values(record)) {
    const found = nestedString(nested, keys, depth + 1);
    if (found) return found;
  }

  return null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function stringValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}
