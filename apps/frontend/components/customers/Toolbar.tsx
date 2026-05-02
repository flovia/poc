"use client";

import type { ChangeEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select, type SelectOption } from "./Select";
import { useFrontendLocale } from "@/lib/frontend-locale";
import type { CustomerChainFilter } from "@/lib/customers/chain";
import type {
  CustomerFilterState,
  CustomerSortKey,
  CustomerUpsellFilter,
} from "@/lib/customers/filter";

type ToolbarProps = {
  total: number;
  filteredCount: number;
  state: CustomerFilterState;
  onChange: (next: CustomerFilterState) => void;
};

export function Toolbar({ total, filteredCount, state, onChange }: ToolbarProps) {
  const { text } = useFrontendLocale();
  const sortOptions: ReadonlyArray<SelectOption<CustomerSortKey>> = [
    { value: "spend", label: text("Spend ↓", "支出 ↓") },
    { value: "observations", label: text("Observations ↓", "観測数 ↓") },
    { value: "lastSeen", label: text("Last seen", "最終確認") },
  ];
  const upsellOptions: ReadonlyArray<SelectOption<CustomerUpsellFilter>> = [
    { value: "all", label: text("All", "すべて") },
    { value: "high", label: text("High", "高") },
    { value: "medium", label: text("Medium", "中") },
    { value: "low", label: text("Low", "低") },
  ];
  const chainOptions: ReadonlyArray<SelectOption<CustomerChainFilter>> = [
    { value: "all", label: text("All", "すべて") },
    { value: "base", label: "Base" },
    { value: "solana", label: "Solana" },
  ];
  const handleQuery = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...state, query: event.target.value });
  };

  const handleSort = (sort: CustomerSortKey) => {
    onChange({ ...state, sort });
  };

  const handleUpsell = (upsell: CustomerUpsellFilter) => {
    onChange({ ...state, upsell });
  };

  const handleChain = (chain: CustomerChainFilter) => {
    onChange({ ...state, chain });
  };

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
          value={state.query}
          onChange={handleQuery}
          placeholder={text("Search payer wallet address…", "支払いウォレットアドレスを検索…")}
          aria-label={text("Search wallets", "ウォレットを検索")}
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
        label={text("Sort", "並び替え")}
        options={sortOptions}
        value={state.sort}
        onChange={handleSort}
      />
      <Select
        label={text("Upsell", "アップセル")}
        options={upsellOptions}
        value={state.upsell}
        onChange={handleUpsell}
      />
      <Select
        label={text("Chain", "チェーン")}
        options={chainOptions}
        value={state.chain}
        onChange={handleChain}
      />
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
        {text(`${filteredCount} of ${total} wallets`, `${total} wallets中 ${filteredCount}`)}
      </span>
    </div>
  );
}
