"use client";

import type { ChangeEvent } from "react";

export type SelectOption<TValue extends string> = {
  value: TValue;
  label: string;
};

type SelectProps<TValue extends string> = {
  label: string;
  options: ReadonlyArray<SelectOption<TValue>>;
  value: TValue;
  onChange: (next: TValue) => void;
};

export function Select<TValue extends string>({ label, options, value, onChange }: SelectProps<TValue>) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as TValue);
  };

  return (
    <label
      className="btn ghost"
      style={{
        padding: "7px 11px",
        fontSize: 14,
        border: "1px solid var(--line)",
        background: "#FFFFFF",
        color: "var(--text-2)",
        gap: 6,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <span style={{ color: "var(--text-mute)", fontSize: 12 }}>{label}:</span>
      <select
        value={value}
        onChange={handleChange}
        aria-label={label}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--text-1)",
          fontSize: 14,
          cursor: "pointer",
          appearance: "none",
          paddingRight: 14,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span aria-hidden style={{ color: "var(--text-mute)", fontSize: 11, marginLeft: -10 }}>
        ▾
      </span>
    </label>
  );
}
