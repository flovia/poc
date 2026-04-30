"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useProviders } from "@/app/providers";

export function EmptyStateCTA() {
  const router = useRouter();
  const { hydrated, stored, optInDemo } = useProviders();

  if (!hydrated || stored.length > 0) return null;

  const handleTryDemo = () => {
    optInDemo();
    router.push("/providers/acme-price/customers");
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
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-mute)",
            marginBottom: 8,
          }}
        >
          Get started
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          You haven&apos;t connected a pay_to yet
        </div>
        <p style={{ color: "var(--text-2)", fontSize: 13.5, margin: 0, maxWidth: 520 }}>
          Try our demo data to see a live example, or connect your own pay_to address below.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button type="button" className="btn primary" onClick={handleTryDemo}>
          Try demo data <Icon.arrow width="14" height="14" />
        </button>
        <button type="button" className="btn ghost" onClick={handleAddPayTo}>
          Connect your pay_to
        </button>
      </div>
    </div>
  );
}
