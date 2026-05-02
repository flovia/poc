import { extractHost } from "./co-usage";

const EVM_ADDRESS = /^0x[0-9a-f]{40}$/i;

// timeline event の providerId は、BFF が
//   1. providers[] と一致する canonical providerId (URL 等) を返すケース
//   2. on-chain only の payment イベントのように payToWallet アドレスを
//      relatedProviderId としてそのまま渡してくるケース
// の 2 系統がある。表示時は、ホスト名 → アドレス → 生 ID の順で
// 「ユーザーに意味のある」ラベルにフォールバックする。
export function resolveProviderLabel(
  rawId: string | null | undefined,
  nameByProviderId: Map<string, string>,
  hostByPayToWallet: Map<string, string>,
): string | null {
  if (!rawId) return null;

  const canonical = nameByProviderId.get(rawId);
  if (canonical) return extractHost(canonical);

  if (EVM_ADDRESS.test(rawId)) {
    const host = hostByPayToWallet.get(rawId.toLowerCase());
    if (host) return host;
  }

  return extractHost(rawId);
}
