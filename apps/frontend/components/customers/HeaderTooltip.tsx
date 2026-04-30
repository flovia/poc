"use client";

import { useId, useState } from "react";

type HeaderTooltipProps = {
  label: string;
  description: string;
};

export function HeaderTooltip({ label, description }: HeaderTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        tabIndex={0}
        aria-describedby={open ? tooltipId : undefined}
        style={{
          cursor: "help",
          borderBottom: "1px dotted var(--text-mute)",
          outline: "none",
        }}
      >
        {label}
      </span>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 50,
            width: 240,
            padding: "10px 12px",
            background: "var(--text-1)",
            color: "#FFFFFF",
            fontSize: 12,
            lineHeight: 1.45,
            fontWeight: 400,
            letterSpacing: 0,
            textTransform: "none",
            borderRadius: "var(--radius)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
            pointerEvents: "none",
            whiteSpace: "normal",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -5,
              left: 14,
              width: 10,
              height: 10,
              background: "var(--text-1)",
              transform: "rotate(45deg)",
              borderRadius: 1,
            }}
          />
          <span style={{ position: "relative", display: "block", fontWeight: 600, marginBottom: 4 }}>
            {label}
          </span>
          <span style={{ position: "relative", display: "block", color: "rgba(255, 255, 255, 0.82)" }}>
            {description}
          </span>
        </span>
      )}
    </span>
  );
}
