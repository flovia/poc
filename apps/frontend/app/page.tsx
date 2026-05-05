"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProviders } from "./providers";
import {
  migrateLegacyDashboardMode,
  readClientDashboardMode,
  type DashboardMode,
} from "@/lib/data-mode";
// Phase 9: barrel ではなく leaf module から直 import.
import { SDK_DEMO_PROVIDER_ID } from "@/lib/sdk-fixtures/shared";

export default function RootRedirect() {
  const router = useRouter();
  const { stored, hydrated } = useProviders();
  // Phase 9: cookie ベースの dataMode 解決. null = まだ解決していない (= router.replace を呼ばない).
  const [dataMode, setDataMode] = useState<DashboardMode | null>(null);

  useEffect(() => {
    // Phase 9: TopBar が描画されない / 経由で legacy localStorage のみ持つブラウザを救済するため,
    // RootRedirect でも migration を 1 回だけ実行する (idempotent, no-op if no legacy keys).
    migrateLegacyDashboardMode();
    setDataMode(readClientDashboardMode());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (dataMode === null) return; // mode 解決待ち
    if (stored.length > 0) {
      router.replace(`/providers/${stored[0].providerId}/customers`);
    } else if (dataMode === "sdkConnected") {
      router.replace(`/providers/${SDK_DEMO_PROVIDER_ID}/customers`);
    } else {
      router.replace("/setup");
    }
  }, [hydrated, dataMode, stored, router]);

  return (
    <main style={{ padding: 40 }}>
      <div className="sk" style={{ width: 220, height: 18, marginBottom: 10 }} />
      <div className="sk" style={{ width: 320, height: 14 }} />
    </main>
  );
}
