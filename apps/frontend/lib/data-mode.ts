// Server / Client 両対応の dashboard mode helper.
// cookie が source of truth、localStorage は CSR ミラー (TopBar の useEffect で片方向再同期).

export type DashboardMode = "onChainOnly" | "sdkConnected";

export const DASHBOARD_MODE_COOKIE = "flovia-dashboard-mode";
export const DASHBOARD_MODE_STORAGE_KEY = "flovia:dashboard-mode";

// Phase 7 で書き込まれた cookie / localStorage を 1 回だけ新 key に書き写してから削除する。
export const LEGACY_COOKIE = "flovia-demo-mode";
export const LEGACY_STORAGE_KEY = "flovia:demo-mode";
export const LEGACY_VALUE_FOR_SDK_CONNECTED = "vision";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function parseDashboardMode(raw: string | undefined | null): DashboardMode | null {
  if (raw === "sdkConnected") return "sdkConnected";
  if (raw === "onChainOnly") return "onChainOnly";
  return null;
}

function parseLegacyMode(raw: string | undefined | null): DashboardMode | null {
  if (raw === LEGACY_VALUE_FOR_SDK_CONNECTED) return "sdkConnected";
  if (raw === undefined || raw === null || raw === "") return null;
  return "onChainOnly";
}

// Server Component / Route Handler 専用.
// The mode switch UI is hidden; default to the on-chain view regardless of
// stale cookies left by older sessions.
export async function getServerDashboardMode(): Promise<DashboardMode> {
  return "onChainOnly";
}

export function readClientDashboardMode(): DashboardMode {
  return "onChainOnly";
}

export function writeClientDashboardMode(mode: DashboardMode): void {
  if (typeof document === "undefined") return;
  document.cookie = [
    `${DASHBOARD_MODE_COOKIE}=${mode}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SEC}`,
    "SameSite=Lax",
  ].join("; ");
  try {
    window.localStorage.setItem(DASHBOARD_MODE_STORAGE_KEY, mode);
  } catch {
    // PoC: ignore quota errors
  }
}

// Phase 7 → Phase 8 migration. TopBar の hydration useEffect で 1 回呼ぶ.
// idempotent: legacy cookie / localStorage が両方とも無ければ no-op (新 key には触らない).
//
// 解決優先順位:
//   1. 新 cookie (`flovia-dashboard-mode`)
//   2. legacy cookie (`flovia-demo-mode`)
//   3. legacy localStorage (`flovia:demo-mode`)
//   4. default ("onChainOnly")
export function migrateLegacyDashboardMode(): void {
  if (typeof document === "undefined") return;

  const hasLegacyCookie = /(?:^|;\s*)flovia-demo-mode=([^;]+)/.test(document.cookie);
  let legacyLocalStorageRaw: string | null = null;
  try {
    legacyLocalStorageRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
  const hasLegacyLocalStorage = legacyLocalStorageRaw !== null;

  if (!hasLegacyCookie && !hasLegacyLocalStorage) return;

  const newCookieMatch = document.cookie.match(/(?:^|;\s*)flovia-dashboard-mode=([^;]+)/);
  const fromNew = parseDashboardMode(
    newCookieMatch ? decodeURIComponent(newCookieMatch[1]) : undefined,
  );

  let resolved: DashboardMode;
  if (fromNew) {
    resolved = fromNew;
  } else if (hasLegacyCookie) {
    resolved = readClientDashboardMode();
  } else if (hasLegacyLocalStorage) {
    const fromLs = parseLegacyMode(legacyLocalStorageRaw);
    resolved = fromLs ?? "onChainOnly";
  } else {
    resolved = "onChainOnly";
  }

  writeClientDashboardMode(resolved);

  if (hasLegacyCookie) {
    document.cookie = `${LEGACY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
  if (hasLegacyLocalStorage) {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
