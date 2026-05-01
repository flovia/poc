type ScopeChipProps = {
  network: string;
  asset: string;
};

// 現状の BFF /customers エンベロープは scope を返さない (null) ため、
// 呼び出し側はフロント固定値 ("base" / "USDC") を渡す。BFF が envelope に
// scope を載せるようになった際は、本コンポーネント自体は変更不要だが、
// adapter (lib/api/adapters.ts) / data-source (lib/data-source.ts) /
// page.tsx までを通して BFF 由来の値を運ぶ配線が別途必要になる。
// 詳細は docs/future-work.md "Surface per-wallet chain & asset on the
// Customers list" を参照。
export function ScopeChip({ network, asset }: ScopeChipProps) {
  const tooltip =
    "Current PoC dataset is scoped to a single network and asset; multi-chain support is a deferred item.";

  return (
    <span
      data-testid="scope-chip"
      title={tooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        color: "var(--text-3)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ color: "var(--text-mute)" }}>Network:</span>
        <span style={{ fontWeight: 600, color: "var(--text-1)", textTransform: "capitalize" }}>
          {network}
        </span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ color: "var(--text-mute)" }}>Asset:</span>
        <span className="mono" style={{ fontWeight: 600, color: "var(--text-1)" }}>
          {asset}
        </span>
      </span>
    </span>
  );
}
