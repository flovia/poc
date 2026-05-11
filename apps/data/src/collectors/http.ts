export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function postJsonRpc(
  fetchImpl: FetchLike,
  endpoint: string,
  body: unknown,
  headers: HeadersInit = {},
): Promise<unknown> {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(`JSON-RPC request failed with HTTP ${response.status}`);
  }
  if (isJsonRpcError(payload)) {
    throw new Error(payload.error.message ?? "JSON-RPC request failed");
  }
  return payload;
}

function isJsonRpcError(payload: unknown): payload is { error: { message?: string } } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "object"
  );
}

export function normalizeHttpsUrl(value: string): string {
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}
