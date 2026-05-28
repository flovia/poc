import type { DashboardMode } from "@/lib/data-mode";

export function shouldShowProviderLayoutSkeleton({
  hydrated,
  dataMode,
  storedCount,
}: {
  hydrated: boolean;
  dataMode: DashboardMode;
  storedCount: number;
}): boolean {
  return hydrated && dataMode === "onChainOnly" && storedCount === 0;
}
