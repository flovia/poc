import { describeChain, type CustomerChain } from "@/lib/customers/chain";

type ChainBadgeProps = {
  chain: CustomerChain;
  asset: string;
};

export function ChainBadge({ chain, asset }: ChainBadgeProps) {
  const visual = describeChain(chain);
  return (
    <span
      data-testid="chain-badge"
      data-chain={chain}
      title={`${visual.label} · ${asset}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: visual.color,
          background: "transparent",
          padding: "1px 6px",
          border: `1px solid ${visual.color}`,
          borderRadius: 999,
        }}
      >
        {visual.short}
      </span>
      <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
        {asset}
      </span>
    </span>
  );
}
