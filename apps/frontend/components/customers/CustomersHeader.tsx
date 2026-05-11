"use client";

import { useActiveProvider } from "@/app/providers";
import type { ProviderBalanceContext } from "@/lib/provider-enrichment";

type CustomersHeaderProps = {
  providerId: string;
  balanceContext?: ProviderBalanceContext;
};

export function CustomersHeader({ providerId, balanceContext }: CustomersHeaderProps) {
  const { active, hydrated } = useActiveProvider(providerId);
  const name = !hydrated ? "…" : active?.name ?? providerId;

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>Provider · {name}</span>
        {balanceContext ? (
          <span
            style={{ textTransform: "none", fontWeight: 400, letterSpacing: "normal", opacity: 0.68 }}
          >
            · {balanceContext.label} {balanceContext.value}
          </span>
        ) : null}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
        Customers calling your API
      </h1>
    </div>
  );
}
