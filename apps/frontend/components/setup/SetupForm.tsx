"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Field, FieldHeader, fieldInputStyle } from "./Field";
import { useProviders } from "@/app/providers";
import { ensureUniqueId, slugifyProviderName } from "@/lib/providers";
import type { StoredProvider, StoredProviderMode } from "@/lib/types";

type PathRow = { apiPath: string; payTo: string };

export function SetupForm() {
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
      if (!addr.trim()) return "pay_to address is required.";
      return null;
    }
    const filled = paths.filter((p) => p.apiPath.trim() && p.payTo.trim());
    if (filled.length === 0) return "Add at least one API path with a pay_to.";
    return null;
  }, [mode, addr, paths]);

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
            <div style={{ fontSize: 13, fontWeight: 600 }}>Configuration</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Choose how your pay_to addresses are organized
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
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: mode === m ? "#FFFFFF" : "var(--text-2)",
                  background: mode === m ? "#1D4ED8" : "transparent",
                  transition: "background 180ms ease, color 180ms ease",
                  fontFamily: "var(--mono)",
                  letterSpacing: "0.02em",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <Field label="Provider name" hint="optional · displayed in your sidebar">
          <input
            id={nameId}
            aria-label="Provider name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Northwind Price API"
            style={fieldInputStyle}
          />
        </Field>

        {mode === "simple" ? (
          <Field label="pay_to address" hint="single 0x… address that receives all x402 payments">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                id={addrId}
                aria-label="pay_to address"
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
                title="Validate (placeholder — no validation in PoC)"
                aria-label="Validate"
                disabled
              >
                <Icon.check width="14" height="14" />
              </button>
            </div>
          </Field>
        ) : (
          <div>
            <FieldHeader label="API path → pay_to mapping" hint="one row per path with its receiving address" />
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
                    style={{ ...fieldInputStyle, fontSize: 13 }}
                  />
                  <input
                    className="mono"
                    aria-label={`pay_to for path ${i + 1}`}
                    value={row.payTo}
                    onChange={(e) => {
                      const np = [...paths];
                      np[i] = { ...np[i], payTo: e.target.value };
                      setPaths(np);
                    }}
                    placeholder="0x..."
                    style={{ ...fieldInputStyle, fontSize: 13 }}
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ width: 28, height: 32, padding: 0 }}
                    onClick={() => setPaths(paths.filter((_, j) => j !== i))}
                    aria-label={`Remove path ${i + 1}`}
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
                + Add another path
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
                title="Load demo data (no save to this browser)"
              >
                Try demo data
              </button>
            )}
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>
              {validation ?? "Stored locally in this browser. No server account required."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={handleSkip}
              disabled={!canSkip}
              title={canSkip ? "Skip to first saved provider" : "No saved providers yet"}
            >
              Skip
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={!canSave}
              title={validation ?? "Save and continue"}
            >
              Save & continue <Icon.arrow width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
