"use client";

import { useActiveProvider } from "@/app/providers";

type CustomersHeaderProps = {
  providerId: string;
};

export function CustomersHeader({ providerId }: CustomersHeaderProps) {
  const { active, hydrated } = useActiveProvider(providerId);
  const name = !hydrated ? "…" : active?.name ?? providerId;

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
          marginBottom: 6,
        }}
      >
        Provider · {name}
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
        Customers calling your API
      </h1>
    </div>
  );
}
