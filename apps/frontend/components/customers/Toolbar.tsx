"use client";

import type { ChangeEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select, type SelectOption } from "./Select";
import type { CustomerChainFilter } from "@/lib/customers/chain";
import type { CustomerFilterState, CustomerSortKey } from "@/lib/customers/filter";

type ToolbarProps = {
  total: number;
  filteredCount: number;
  state: CustomerFilterState;
  onChange: (next: CustomerFilterState) => void;
};

const SORT_OPTIONS: ReadonlyArray<SelectOption<CustomerSortKey>> = [
  { value: "spend", label: "Spend ↓" },
  { value: "observations", label: "Calls ↓" },
  { value: "providers", label: "Providers ↓" },
  { value: "lastSeen", label: "Last seen" },
];

const CHAIN_OPTIONS: ReadonlyArray<SelectOption<CustomerChainFilter>> = [
  { value: "all", label: "All" },
  { value: "base", label: "Base" },
  { value: "solana", label: "Solana" },
  { value: "tempo", label: "Tempo" },
  { value: "x-layer", label: "X Layer" },
  { value: "polygon", label: "Polygon" },
  { value: "polygon-amoy", label: "Polygon Amoy" },
  { value: "base-sepolia", label: "Base Sepolia" },
  { value: "avalanche", label: "Avalanche" },
  { value: "other", label: "Other" },
];

export function Toolbar({ total, filteredCount, state, onChange }: ToolbarProps) {
  const handleQuery = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...state, query: event.target.value });
  };

  const handleSort = (sort: CustomerSortKey) => {
    onChange({ ...state, sort });
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
          placeholder="Search payer wallet address…"
          aria-label="Search wallets"
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
        options={SORT_OPTIONS}
        value={state.sort}
        onChange={handleSort}
      />
      <Select
        label="Chain"
        options={CHAIN_OPTIONS}
        value={state.chain}
        onChange={handleChain}
      />
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
        {filteredCount} of {total} wallets
      </span>
    </div>
  );
}
