"use client";

// Phase 8: TopBar の dashboard mode 切替 UI. Phase 7 の単一トグルを 2 状態 segmented control に置換.
// design.md §4 で確定: role="radiogroup" + role="radio" × 2, roving tabindex,
// Arrow キーはフォーカス移動だけ, Space/Enter で commit (= reload). auto-select はしない.

import { useRef, useState } from "react";
import type { DashboardMode } from "@/lib/data-mode";
import { writeClientDashboardMode } from "@/lib/data-mode";

const SEGMENTS: ReadonlyArray<{ value: DashboardMode; label: string; title: string }> = [
  {
    value: "onChainOnly",
    label: "On-chain only",
    title: "Show on-chain-only dashboard",
  },
  {
    value: "sdkConnected",
    label: "SDK connected (mock demo)",
    title: "Show SDK-connected preview",
  },
];

type Props = { mode: DashboardMode };

export function DashboardModeToggle({ mode }: Props) {
  const groupRef = useRef<HTMLDivElement>(null);

  // roving tabindex: tabIndex=0 を持つのは「現在 focus 候補」の 1 つだけ.
  // 初期値は selected radio に合わせる. Arrow キーで focus 移動した時はその候補を更新する.
  // selected = aria-checked のみで表現し, focus 候補と分離する (auto-select しない要件).
  const initialIndex = SEGMENTS.findIndex((seg) => seg.value === mode);
  const [focusedIndex, setFocusedIndex] = useState<number>(
    initialIndex >= 0 ? initialIndex : 0,
  );

  // commit: target が現状と異なるときだけ cookie 書込 + reload.
  const commit = (target: DashboardMode) => {
    if (target === mode) return;
    writeClientDashboardMode(target);
    window.location.reload();
  };

  // Arrow キーは「兄弟 radio へフォーカス移動」のみ. auto-select しない.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    if (!buttons || buttons.length === 0) return;
    const currentIndex = Array.from(buttons).findIndex((b) => b === document.activeElement);
    if (currentIndex < 0) return;
    const next =
      e.key === "ArrowRight"
        ? (currentIndex + 1) % buttons.length
        : (currentIndex - 1 + buttons.length) % buttons.length;
    setFocusedIndex(next);
    buttons[next].focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Dashboard mode"
      className="dashboard-mode-toggle"
    >
      {SEGMENTS.map((seg, i) => {
        const checked = mode === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={i === focusedIndex ? 0 : -1}
            title={seg.title}
            onClick={() => {
              setFocusedIndex(i);
              commit(seg.value);
            }}
            onKeyDown={onKeyDown}
            className={checked ? "active" : ""}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
