import { describeChain, type CustomerChain } from "@/lib/customers/chain";

type ChainBadgeProps = {
  chain: CustomerChain;
  /** Optional. When provided, the asset is rendered next to the chain pill. */
  asset?: string;
};

export function ChainBadge({ chain, asset }: ChainBadgeProps) {
  const visual = describeChain(chain);
  return (
    <span
      data-testid="chain-badge"
      data-chain={chain}
      title={asset ? `${visual.label} · ${asset}` : visual.label}
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
      {asset && (
        <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
          {asset}
        </span>
      )}
    </span>
  );
}
