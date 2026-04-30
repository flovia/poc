export function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

// BFF は通貨換算を行わず、金額を atomic unit の文字列として返す。USDC 等の
// 6 decimals を既定として小数表記に整形するだけのヘルパ。
const DEFAULT_DECIMALS = 6;

export function formatAtomic(
  atomic: string,
  decimals: number = DEFAULT_DECIMALS,
  fractionDigits: number = 3,
): string {
  if (!atomic) return "0";
  let raw = atomic;
  let negative = false;
  if (raw.startsWith("-")) {
    negative = true;
    raw = raw.slice(1);
  }
  const padded = raw.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals);
  const fracPart = padded.slice(padded.length - decimals);
  const intDisplay = BigInt(intPart).toLocaleString();
  if (fractionDigits <= 0) {
    return `${negative ? "-" : ""}${intDisplay}`;
  }
  const truncatedFrac = fracPart.slice(0, fractionDigits).padEnd(fractionDigits, "0");
  return `${negative ? "-" : ""}${intDisplay}.${truncatedFrac}`;
}

export function formatRatioPct(ratio: number, fractionDigits = 0): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

export function formatGrowth(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const pct = Math.round(value * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export function formatTimestamp(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "—";
  return new Date(unixSeconds * 1000).toISOString().replace("T", " ").slice(0, 19);
}

// 相対時間表示。TopBar の "Updated Xm ago" 等で使用する。
// `nowUnixSec` は呼び出し側で `Date.now() / 1000` を渡す前提 (setInterval で追従)。
export function formatRelativeAge(unixSec: number | undefined, nowUnixSec: number): string {
  if (unixSec === undefined || !Number.isFinite(unixSec) || unixSec <= 0) {
    return "Updated —";
  }
  const diffSec = Math.max(0, nowUnixSec - unixSec);
  if (diffSec < 60) return "Updated just now";
  if (diffSec < 60 * 60) {
    const minutes = Math.floor(diffSec / 60);
    return `Updated ${minutes}m ago`;
  }
  if (diffSec < 24 * 3600) {
    const hours = Math.floor(diffSec / 3600);
    return `Updated ${hours}h ago`;
  }
  const days = Math.floor(diffSec / 86400);
  return `Updated ${days}d ago`;
}

export function shortAddr(address: string): string {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
