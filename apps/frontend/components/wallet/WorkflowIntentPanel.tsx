"use client";

import { useEffect, useMemo, useState } from "react";
import { getCustomerWorkflowIntent } from "@/lib/api/client";
import type { CustomerWorkflowIntentDto } from "@/lib/api/types";
import { formatAtomic, formatTimestamp } from "@/lib/format";
import { formatUpsellExplanationModelName } from "./UpsellExplanationPanel";

const MAX_VISIBLE_WORKFLOW_SESSIONS = 3;
const GENERIC_WORKFLOW_DISCLAIMER_PATTERN =
  /\b(?:the\s+input|the\s+data)\s+does\s+not\s+specify\b/i;

type WorkflowIntentState =
  | { status: "loading" }
  | { status: "ready"; data: CustomerWorkflowIntentDto }
  | { status: "unavailable" }
  | { status: "error" };

export function selectLatestWorkflowIntentSessions(
  data: Pick<CustomerWorkflowIntentDto, "sessions" | "remainingSessionCount">,
) {
  const sessions = [...data.sessions]
    .sort((left, right) => right.endedAt - left.endedAt || right.startedAt - left.startedAt)
    .slice(0, MAX_VISIBLE_WORKFLOW_SESSIONS);

  return {
    sessions,
    omittedCount:
      data.remainingSessionCount + Math.max(0, data.sessions.length - sessions.length),
  };
}

export function cleanWorkflowIntentDisplayText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !GENERIC_WORKFLOW_DISCLAIMER_PATTERN.test(part))
    .join(" ")
    .trim();
}

export function formatWorkflowIntentSessionTotal(totalAmountAtomic: string): string {
  return `${formatAtomic(totalAmountAtomic)} USDC`;
}

function SkeletonLine({ width }: { width: string }) {
  return <div className="sk" style={{ width, height: 11, borderRadius: 999 }} />;
}

function LoadingPanel() {
  return (
    <div
      className="card"
      style={{ padding: "16px 20px", background: "#FFFFFF", display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--text-mute)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Workflow intent
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SkeletonLine width="46%" />
        <SkeletonLine width="94%" />
        <SkeletonLine width="86%" />
        <SkeletonLine width="72%" />
      </div>
    </div>
  );
}

export function WorkflowIntentPanel({ address }: { address: string }) {
  const [state, setState] = useState<WorkflowIntentState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void getCustomerWorkflowIntent(address)
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

  const explanationBySessionId = useMemo(() => {
    if (state.status !== "ready") return new Map<string, CustomerWorkflowIntentDto["explanations"][number]>();
    return new Map(state.data.explanations.map((explanation) => [explanation.sessionId, explanation] as const));
  }, [state]);

  if (state.status === "loading") {
    return <LoadingPanel />;
  }

  if (state.status === "unavailable" || state.status === "error") {
    return (
      <div
        className="card"
        style={{ padding: "16px 20px", background: "#FFFFFF", display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div
          style={{
            fontSize: 12,
            color: "var(--text-mute)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Workflow intent
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55 }}>
          Session-level intent analysis is unavailable right now.
        </div>
      </div>
    );
  }

  const { data } = state;
  const modelName = data.modelId ? formatUpsellExplanationModelName(data.modelId) : null;
  const { sessions, omittedCount } = selectLatestWorkflowIntentSessions(data);

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: "hidden", background: "#FFFFFF", display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line)" }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-mute)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Workflow intent
        </div>
        <div className="display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Short-session purpose analysis
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.5, marginTop: 6 }}>
          Payment-linked API bursts within {Math.floor(data.sessionWindowSeconds / 60)} minutes are grouped as one workflow session and explained as a likely user goal.
        </div>
        {modelName && (
          <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 8 }}>
            Summarized by {modelName}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {data.analysisStatus === "no_candidate_sessions" || sessions.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55 }}>
            No short multi-step API bursts were observed for this wallet in the current timeline.
          </div>
        ) : (
          <>
            {data.analysisStatus === "unavailable" && (
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
                LLM analysis is not configured in this environment. Grouped sessions are shown below.
              </div>
            )}
            {data.analysisStatus === "failed" && (
              <div style={{ fontSize: 12, color: "var(--warn)", lineHeight: 1.5 }}>
                LLM analysis failed for these sessions. Grouped activity is still shown below.
                {data.failureMessage ? ` ${data.failureMessage}` : ""}
              </div>
            )}

            {sessions.map((session, index) => {
              const explanation = explanationBySessionId.get(session.sessionId);
              const cleanedIntent = explanation
                ? cleanWorkflowIntentDisplayText(explanation.intent)
                : "";
              const cleanedScenarios = explanation
                ? explanation.scenarios
                    .map((scenario) => cleanWorkflowIntentDisplayText(scenario))
                    .filter(Boolean)
                : [];
              const cleanedEvidence = explanation
                ? explanation.evidence
                    .map((line) => cleanWorkflowIntentDisplayText(line))
                    .filter(Boolean)
                : [];
              const cleanedCaution = explanation
                ? cleanWorkflowIntentDisplayText(explanation.caution)
                : "";
              return (
                <div
                  key={session.sessionId}
                  style={{
                    padding: "14px 14px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    background: index === 0 ? "rgba(47, 93, 154, 0.04)" : "rgba(255,255,255,0.7)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-mute)",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Session {index + 1}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--text-1)", fontWeight: 600 }}>
                        {formatTimestamp(session.startedAt)} to {formatTimestamp(session.endedAt)}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "right" }}>
                      <div>{session.eventCount} calls</div>
                      <div>{session.distinctProviderCount} APIs</div>
                      <div className="mono">{formatWorkflowIntentSessionTotal(session.totalAmountAtomic)}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      lineHeight: 1.65,
                      marginBottom: 10,
                    }}
                  >
                    {session.events
                      .map((event) => `${event.providerName} (${event.activityLabel})`)
                      .join(" -> ")}
                  </div>

                  {explanation ? (
                    <>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--mesh-blue)",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        {explanation.summary}
                      </div>
                      {cleanedIntent && (
                        <div style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.65 }}>
                          {cleanedIntent}
                        </div>
                      )}
                      {cleanedScenarios.length > 0 && (
                        <>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-mute)",
                              fontWeight: 700,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              marginTop: 10,
                              marginBottom: 6,
                            }}
                          >
                            Possible user scenarios
                          </div>
                          <ul
                            style={{
                              margin: "0 0 0 18px",
                              padding: 0,
                              fontSize: 13,
                              color: "var(--text-2)",
                              lineHeight: 1.6,
                            }}
                          >
                            {cleanedScenarios.map((scenario, scenarioIndex) => (
                              <li key={scenarioIndex}>{scenario}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {cleanedEvidence.length > 0 && (
                        <ul
                          style={{
                            margin: "10px 0 0",
                            paddingLeft: 18,
                            fontSize: 13,
                            color: "var(--text-2)",
                            lineHeight: 1.6,
                          }}
                        >
                          {cleanedEvidence.map((line, evidenceIndex) => (
                            <li key={evidenceIndex}>{line}</li>
                          ))}
                        </ul>
                      )}
                      {cleanedCaution && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-mute)", lineHeight: 1.55 }}>
                          {cleanedCaution}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55 }}>
                      This session was grouped for intent analysis, but no explanation is available yet.
                    </div>
                  )}
                </div>
              );
            })}

            {omittedCount > 0 && (
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
                +{omittedCount} more session
                {omittedCount === 1 ? "" : "s"} omitted from the current explanation.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
