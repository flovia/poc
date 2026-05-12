"use client";

import { useEffect, useState } from "react";
import { getCustomerUpsellExplanation } from "@/lib/api/client";
import type { CustomerUpsellExplanationDto } from "@/lib/api/types";

const MAX_SUMMARY_TITLE_LENGTH = 60;
const MIN_CLAUSE_TITLE_LENGTH = 18;

type UpsellExplanationState =
  | { status: "loading" }
  | { status: "ready"; data: CustomerUpsellExplanationDto }
  | { status: "unavailable" }
  | { status: "error" };

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

function toModelNameCandidate(modelId: string): string {
  const basename = modelId.split(/[\\/]/).pop() ?? modelId;
  const withoutVariant = basename.replace(/:\d+$/i, "");
  const withoutExtension = withoutVariant.replace(/\.(gguf|bin|onnx)$/i, "");
  const segments = withoutExtension.split(".");

  if (segments.length > 1 && segments.slice(0, -1).every((segment) => /^[a-z][a-z0-9-]*$/.test(segment))) {
    return segments[segments.length - 1] ?? withoutExtension;
  }

  return withoutExtension;
}

export function compactUpsellSummary(summary: string): string {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_SUMMARY_TITLE_LENGTH) {
    return normalized;
  }

  const shortClause = normalized
    .split(/[,:;.!?]/)
    .map((part) => part.trim())
    .find(
      (part) =>
        part.length >= MIN_CLAUSE_TITLE_LENGTH && part.length <= MAX_SUMMARY_TITLE_LENGTH,
    );

  if (shortClause) {
    return shortClause;
  }

  return `${normalized.slice(0, MAX_SUMMARY_TITLE_LENGTH - 3).trimEnd()}...`;
}

export function formatUpsellExplanationModelName(modelId: string): string {
  const normalized = toModelNameCandidate(modelId)
    .replace(/-\d{8}-v\d+(?::\d+)?$/i, "")
    .replace(/:\d+$/i, "");

  const claudeVersionFirst = normalized.match(/^claude-(\d)-(\d+)-(sonnet|opus|haiku)$/i);
  if (claudeVersionFirst) {
    const [, major, minor, tier] = claudeVersionFirst;
    return `Claude ${major}.${minor} ${capitalizeWord(tier.toLowerCase())}`;
  }

  const claudeTierFirst = normalized.match(/^claude-(sonnet|opus|haiku)-(\d)-(\d+)$/i);
  if (claudeTierFirst) {
    const [, tier, major, minor] = claudeTierFirst;
    return `Claude ${capitalizeWord(tier.toLowerCase())} ${major}.${minor}`;
  }

  const claudeSingleVersion = normalized.match(/^claude-(sonnet|opus|haiku)-(\d+)$/i);
  if (claudeSingleVersion) {
    const [, tier, major] = claudeSingleVersion;
    return `Claude ${capitalizeWord(tier.toLowerCase())} ${major}`;
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) =>
      /^[0-9]+[A-Z0-9_]+$/.test(part) ? part : capitalizeWord(part.toLowerCase()),
    )
    .join(" ");
}

function SkeletonLine({
  width,
  height = 11,
}: {
  width: string;
  height?: number;
}) {
  return <div className="sk" style={{ width, height, borderRadius: 999 }} />;
}

function LoadingPanel() {
  return (
    <div
      aria-busy="true"
      style={{
        background: "rgba(47, 93, 154, 0.04)",
        borderRadius: 10,
        padding: "12px 13px",
        border: "1px solid var(--line-strong)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--mesh-blue)",
          }}
        >
          LLM explanation
        </div>
      </div>
      <SkeletonLine width="88%" height={14} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonLine width="96%" />
        <SkeletonLine width="84%" />
        <SkeletonLine width="78%" />
      </div>
      <SkeletonLine width="68%" />
      <SkeletonLine width="92%" />
    </div>
  );
}

export function UpsellExplanationPanel({ address }: { address: string }) {
  const [state, setState] = useState<UpsellExplanationState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void getCustomerUpsellExplanation(address)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState({ status: "unavailable" });
          return;
        }
        setState({ status: "ready", data });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  if (state.status === "loading") {
    return <LoadingPanel />;
  }

  if (state.status === "unavailable" || state.status === "error") {
    return (
      <div
        style={{
          background: "rgba(47, 93, 154, 0.04)",
          borderRadius: 10,
          padding: "12px 13px",
          border: "1px solid var(--line-strong)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--mesh-blue)",
            marginBottom: 6,
          }}
        >
          LLM explanation
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
          Explanation is unavailable right now. The heuristic inputs above are still available.
        </div>
      </div>
    );
  }

  const { data } = state;
  const modelName = formatUpsellExplanationModelName(data.modelId);

  return (
    <div
      style={{
        background: "rgba(47, 93, 154, 0.04)",
        borderRadius: 10,
        padding: "12px 13px",
        border: "1px solid var(--line-strong)",
      }}
    >
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--mesh-blue)",
          }}
        >
          LLM explanation
        </div>
        <div
          title={data.modelId}
          style={{
            flexShrink: 0,
            maxWidth: "42%",
            fontSize: 11,
            color: "var(--text-mute)",
            lineHeight: 1.4,
            textAlign: "right",
          }}
        >
          Summarized by {modelName}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div
          className="display"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--text-mute)",
          }}
        >
          User Activity Summary
        </div>
      </div>

      <ul
        style={{
          margin: 0,
        }}
      >
        {data.reasons.map((reason, index) => (
          <li key={`${data.generatedAt}:${index}`} style={{
            fontSize: 13,
            color: "var(--text-1)",
            lineHeight: 1.5
          }}>{reason}</li>
        ))}
      </ul>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
              marginBottom: 4,
            }}
          >
            Recommended action
          </div>
          <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.5 }}>
            {data.recommendedAction}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
              marginBottom: 4,
            }}
          >
            Caution
          </div>
          <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.5 }}>
            {data.caution}
          </div>
        </div>

      </div>
    </div>
  );
}
