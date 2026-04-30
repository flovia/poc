"use client";

import { useProviders } from "@/app/providers";

export function DemoModeBanner() {
  const { hydrated, demoOpted, optOutDemo } = useProviders();
  if (!hydrated || !demoOpted) return null;

  const handleReset = () => {
    if (window.confirm("Reset demo data? Your own providers will be kept.")) {
      optOutDemo();
    }
  };

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        marginTop: 24,
        marginBottom: 12,
        borderRadius: 8,
        background: "rgba(20, 184, 166, 0.06)",
        border: "1px solid rgba(20, 184, 166, 0.18)",
        fontSize: 12.5,
        color: "var(--text-2)",
      }}
    >
      <span>Showing demo data</span>
      <button
        type="button"
        onClick={handleReset}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--teal)",
          fontSize: 12.5,
          fontWeight: 500,
          cursor: "pointer",
          padding: 0,
        }}
      >
        Reset demo
      </button>
    </div>
  );
}
