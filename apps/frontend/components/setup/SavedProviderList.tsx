"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProviders } from "@/app/providers";
import { Icon } from "@/components/ui/Icon";
import { classNames } from "@/lib/format";
import { useFrontendLocale } from "@/lib/frontend-locale";
import { getDisplayPayTo, getPathCount, isDemoProvider } from "@/lib/providers";

function daysAgo(ts: number): number {
  return Math.max(0, Math.round((Date.now() - ts) / 86_400_000));
}

export function SavedProviderList() {
  const { text } = useFrontendLocale();
  const { stored, userProviders, hydrated, removeProvider, demoOpted } = useProviders();
  const userIds = useMemo(
    () => new Set(userProviders.map((p) => p.providerId)),
    [userProviders],
  );
  const demoCount = stored.length - userProviders.length;

  return (
    <div style={{ marginTop: 36 }}>
      <div className="section-title">
        <h2>{text("Saved providers", "保存済みプロバイダー")}</h2>
        <span style={{ fontSize: 13, color: "var(--text-3)" }}>
          {!hydrated
            ? text("loading…", "読み込み中…")
            : demoOpted
              ? text(`${stored.length} providers · ${userProviders.length} saved, ${demoCount} demo`, `${stored.length}プロバイダー · 保存${userProviders.length}件、デモ${demoCount}件`)
              : `${stored.length} pay_to · localStorage`}
        </span>
      </div>
      <div className="card" style={{ padding: 6 }}>
        {!hydrated ? (
          <>
            <div className="sk" style={{ height: 44, margin: 8 }} />
            <div className="sk" style={{ height: 44, margin: 8 }} />
            <div className="sk" style={{ height: 44, margin: 8 }} />
          </>
        ) : stored.length === 0 ? (
          <div style={{ padding: 18, color: "var(--text-3)", fontSize: 14 }}>
            {text("No providers saved yet. Add one above to get started.", "保存済みプロバイダーはまだありません。上から追加して開始してください。")}
          </div>
        ) : (
          stored.map((p, i) => {
            const isDemo = isDemoProvider(p, demoOpted, userIds);
            return (
              <div
                key={p.providerId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 220px 100px 110px",
                  alignItems: "center",
                  padding: "12px 14px",
                  gap: 12,
                  borderBottom: i < stored.length - 1 ? "1px solid var(--line)" : "none",
                  borderRadius: 10,
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(148,163,184,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--text-mute)",
                      boxShadow: "none",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                      {p.mode} · {getPathCount(p)} {text(getPathCount(p) === 1 ? "path" : "paths", "path")} · {text(`added ${daysAgo(p.createdAt)}d ago`, `${daysAgo(p.createdAt)}日前に追加`)}
                    </div>
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 13, color: "var(--text-2)" }}>
                  {getDisplayPayTo(p)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className={classNames("chip")}>{p.mode}</span>
                  {isDemo && (
                    <span
                      className={classNames("chip")}
                      style={{ color: "var(--text-3)" }}
                      title={text("Demo provider — use Reset demo to remove all", "デモプロバイダー — すべて削除するにはデモをリセットしてください")}
                    >
                      {text("demo", "デモ")}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Link
                    className="btn ghost"
                    style={{ padding: "5px 10px", fontSize: 13 }}
                    href={`/providers/${p.providerId}/customers`}
                  >
                    {text("Open", "開く")}
                  </Link>
                  {isDemo ? (
                    <span
                      style={{ width: 28, height: 28 }}
                      title={text("Demo provider — use Reset demo to remove all", "デモプロバイダー — すべて削除するにはデモをリセットしてください")}
                      aria-hidden
                    />
                  ) : (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: "5px 8px", color: "var(--text-3)" }}
                      title={text("Remove", "削除")}
                      aria-label={text(`Remove ${p.name}`, `${p.name}を削除`)}
                      onClick={() => {
                        if (window.confirm(text(`Remove ${p.name} from this browser?`, `${p.name} をこのブラウザから削除しますか？`))) {
                          removeProvider(p.providerId);
                        }
                      }}
                    >
                      <Icon.x width="12" height="12" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
