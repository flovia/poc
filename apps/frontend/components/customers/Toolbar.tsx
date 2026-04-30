import { Icon } from "@/components/ui/Icon";
import { Select } from "./Select";

type ToolbarProps = {
  total: number;
};

export function Toolbar({ total }: ToolbarProps) {
  return (
    <div
      className="card"
      style={{ padding: 10, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}
    >
      <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
        <Icon.search
          width="14"
          height="14"
          style={{ position: "absolute", left: 11, top: 10, color: "var(--text-3)" }}
        />
        <input
          placeholder="Search payer wallet address… (PoC: not wired)"
          aria-label="Search wallets"
          aria-disabled
          readOnly
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            borderRadius: 8,
            background: "#FFFFFF",
            border: "1px solid var(--line)",
            fontSize: 14,
          }}
        />
      </div>
      <Select
        label="Sort"
        options={["Spend ↓", "Observations ↓", "Activity growth ↓", "Last seen"]}
        value="Spend ↓"
      />
      <Select label="Upsell" options={["All", "High", "Medium", "Low"]} />
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
        {total} of {total} wallets
      </span>
    </div>
  );
}
