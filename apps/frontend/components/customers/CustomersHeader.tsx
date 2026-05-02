"use client";

import { useActiveProvider } from "@/app/providers";
import { useFrontendLocale } from "@/lib/frontend-locale";

type CustomersHeaderProps = {
  providerId: string;
};

export function CustomersHeader({ providerId }: CustomersHeaderProps) {
  const { text } = useFrontendLocale();
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
        }}
      >
        {text("Provider", "プロバイダー")} · {name}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
        {text("Customers calling your API", "あなたのAPIを呼び出している顧客")}
      </h1>
    </div>
  );
}
