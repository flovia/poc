"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Field, FieldHeader, fieldInputStyle } from "./Field";
import { useProviders } from "@/app/providers";
import { useFrontendLocale } from "@/lib/frontend-locale";
import { ensureUniqueId, slugifyProviderName } from "@/lib/providers";
import type { StoredProvider, StoredProviderMode } from "@/lib/types";

type PathRow = { apiPath: string; payTo: string };

export function SetupForm() {
  const { text } = useFrontendLocale();
  const router = useRouter();
  const { stored, userProviders, addProvider, hydrated, demoOpted, optInDemo } = useProviders();

  const nameId = useId();
  const addrId = useId();

  const [mode, setMode] = useState<StoredProviderMode>("advanced");
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [paths, setPaths] = useState<PathRow[]>([
    { apiPath: "/v1/price/history", payTo: "" },
    { apiPath: "/v1/price/snapshot", payTo: "" },
  ]);

  const validation = useMemo<string | null>(() => {
    if (mode === "simple") {
      if (!addr.trim()) return text("pay_to address is required.", "pay_toアドレスは必須です。");
      return null;
    }
    const filled = paths.filter((p) => p.apiPath.trim() && p.payTo.trim());
    if (filled.length === 0)
      return text(
        "Add at least one API path with a pay_to.",
        "API path と pay_to を少なくとも1行追加してください。",
      );
    return null;
  }, [mode, addr, paths, text]);

  const canSave = validation === null;
  const canSkip = stored.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const desiredId = slugifyProviderName(name || "untitled");
    // 衝突判定は userProviders ベース。stored を使うと demo の providerId と
    // 衝突して northwind-price を名乗れず、demo 上書き要件 (§4.1 #12) が破綻する。
    const providerId = ensureUniqueId(
      desiredId,
      userProviders.map((p) => p.providerId),
    );
    const base = {
      providerId,
      name: name.trim() || "Untitled provider",
      createdAt: Date.now(),
    };
    const next: StoredProvider =
      mode === "simple"
        ? { ...base, mode: "simple", payTo: addr.trim() }
        : {
            ...base,
            mode: "advanced",
            paths: paths
              .filter((p) => p.apiPath.trim() && p.payTo.trim())
              .map((p) => ({ apiPath: p.apiPath.trim(), payTo: p.payTo.trim() })),
          };
    addProvider(next);
    router.push(`/providers/${providerId}/customers`);
  };

  const handleSkip = () => {
    if (!canSkip) return;
    router.push(`/providers/${stored[0].providerId}/customers`);
  };

  const handleTryDemo = () => {
    optInDemo();
    router.push("/providers/northwind-price/customers");
  };

  return (
    <div className="card" style={{ position: "relative", padding: 28, overflow: "hidden" }}>
      <div style={{ position: "relative" }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{text("Configuration", "設定")}</div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              {text(
                "Choose how your pay_to addresses are organized",
                "pay_toアドレスの管理方法を選択します",
              )}
            </div>
          </div>
          <div
            role="tablist"
            aria-label="Configuration mode"
            style={{
              display: "inline-flex",
              padding: 3,
              borderRadius: 4,
              background: "#F2F4F7",
              border: "1px solid var(--line)",
              position: "relative",
            }}
          >
            {(["simple", "advanced"] as const).map((m) => (
              <button
                type="button"
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 3,
                  fontSize: 13,
                  fontWeight: 500,
                  color: mode === m ? "#FFFFFF" : "var(--text-2)",
                  background: mode === m ? "var(--mesh-blue)" : "transparent",
                  transition: "background 180ms ease, color 180ms ease",
                  fontFamily: "var(--mono)",
                  letterSpacing: "0.02em",
                }}
              >
                {m === "simple" ? text("simple", "simple（単一）") : text("advanced", "advanced（複数path）")}
              </button>
            ))}
          </div>
        </div>

        <Field
          label={text("Provider name", "プロバイダー名")}
          hint={text("optional · displayed in your sidebar", "任意 · サイドバーに表示されます")}
        >
          <input
            id={nameId}
            aria-label={text("Provider name", "プロバイダー名")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Northwind Price API"
            style={fieldInputStyle}
          />
        </Field>

        {mode === "simple" ? (
          <Field
            label={text("pay_to address", "pay_toアドレス")}
            hint={text(
              "single 0x… address that receives all x402 payments",
              "すべてのx402支払いを受け取る単一の0x…アドレス",
            )}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                id={addrId}
                aria-label={text("pay_to address", "pay_toアドレス")}
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder="0x4E2c91A9...8Df1"
                className="mono"
                style={{ ...fieldInputStyle, fontSize: 14 }}
              />
              <button
                type="button"
                className="btn ghost"
                style={{ padding: "8px 10px" }}
                title={text("Validate (placeholder — no validation in PoC)", "検証（PoCでは未実装）")}
                aria-label={text("Validate", "検証")}
                disabled
              >
                <Icon.check width="14" height="14" />
              </button>
            </div>
          </Field>
        ) : (
          <div>
            <FieldHeader
              label={text("API path → pay_to mapping", "API path → pay_to 対応表")}
              hint={text(
                "one row per path with its receiving address",
                "pathごとに受取アドレスを1行で設定します",
              )}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paths.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr 28px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    className="mono"
                    aria-label={`API path ${i + 1}`}
                    value={row.apiPath}
                    onChange={(e) => {
                      const np = [...paths];
                      np[i] = { ...np[i], apiPath: e.target.value };
                      setPaths(np);
                    }}
                    placeholder="/v1/path"
                    style={{ ...fieldInputStyle, fontSize: 14 }}
                  />
                  <input
                    className="mono"
                    aria-label={text(`pay_to for path ${i + 1}`, `path ${i + 1} の pay_to`)}
                    value={row.payTo}
                    onChange={(e) => {
                      const np = [...paths];
                      np[i] = { ...np[i], payTo: e.target.value };
                      setPaths(np);
                    }}
                    placeholder="0x..."
                    style={{ ...fieldInputStyle, fontSize: 14 }}
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ width: 28, height: 32, padding: 0 }}
                    onClick={() => setPaths(paths.filter((_, j) => j !== i))}
                    aria-label={text(`Remove path ${i + 1}`, `path ${i + 1} を削除`)}
                  >
                    <Icon.x width="12" height="12" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-pay"
                onClick={() => setPaths([...paths, { apiPath: "", payTo: "" }])}
              >
                {text("+ Add another path", "+ pathを追加")}
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 28,
            paddingTop: 22,
            borderTop: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {hydrated && !demoOpted && (
              <button
                type="button"
                className="btn ghost"
                onClick={handleTryDemo}
                title={text(
                  "Load demo data (no save to this browser)",
                  "デモデータを読み込む（このブラウザには保存しません）",
                )}
              >
                {text("Try demo data", "デモデータを試す")}
              </button>
            )}
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>
              {validation
                ?? text(
                  "Stored locally in this browser. No server account required.",
                  "このブラウザにローカル保存されます。サーバーアカウントは不要です。",
                )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={handleSkip}
              disabled={!canSkip}
              title={
                canSkip
                  ? text("Skip to first saved provider", "保存済みプロバイダーへ移動")
                  : text("No saved providers yet", "保存済みプロバイダーはまだありません")
              }
            >
              {text("Skip", "スキップ")}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={!canSave}
              title={validation ?? text("Save and continue", "保存して続行")}
            >
              {text("Save & continue", "保存して続行")} <Icon.arrow width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
