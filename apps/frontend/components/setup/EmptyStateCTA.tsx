"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useProviders } from "@/app/providers";
import { useFrontendLocale } from "@/lib/frontend-locale";

export function EmptyStateCTA() {
  const { text } = useFrontendLocale();
  const router = useRouter();
  const { hydrated, stored, optInDemo } = useProviders();

  if (!hydrated || stored.length > 0) return null;

  const handleTryDemo = () => {
    optInDemo();
    router.push("/providers/northwind-price/customers");
  };

  const handleAddPayTo = () => {
    const form = document.getElementById("setup-form-anchor");
    if (!form) return;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstInput = form.querySelector<HTMLInputElement>("input");
    firstInput?.focus({ preventScroll: true });
  };

  return (
    <div className="card" style={{ padding: 28, marginBottom: 24 }}>
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-mute)",
            marginBottom: 8,
          }}
        >
          {text("Get started", "はじめる")}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
          {text("No pay_to connected yet", "No pay_to connected yet（pay_to未接続）")}
        </div>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: 0, maxWidth: 520 }}>
          {text("Try demo data to see an example, or connect your own pay_to address below.", "Try demo data で例を見るか、下から自分の pay_to address を接続してください。")}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button type="button" className="btn primary" onClick={handleTryDemo}>
          {text("Try demo data", "デモデータを試す")} <Icon.arrow width="14" height="14" />
        </button>
        <button type="button" className="btn ghost" onClick={handleAddPayTo}>
          {text("Connect your pay_to", "pay_to を接続")}
        </button>
      </div>
    </div>
  );
}
