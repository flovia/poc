import { describe, expect, test } from "bun:test";
import type { CustomerWorkflowIntentDto } from "@/lib/api/types";
import {
  cleanWorkflowIntentDisplayText,
  formatWorkflowIntentSessionTotal,
  selectLatestWorkflowIntentSessions,
} from "./WorkflowIntentPanel";

function buildWorkflowIntentData(
  sessions: CustomerWorkflowIntentDto["sessions"],
  remainingSessionCount = 0,
): CustomerWorkflowIntentDto {
  return {
    generatedAt: "2026-05-07T00:00:00.000Z",
    address: "0x0000000000000000000000000000000000000001",
    sessionWindowSeconds: 300,
    sessionCount: sessions.length + remainingSessionCount,
    remainingSessionCount,
    analysisStatus: "ready",
    failureMessage: null,
    modelId: null,
    sessions,
    explanations: [],
  };
}

describe("selectLatestWorkflowIntentSessions", () => {
  test("keeps only the latest three sessions in descending recency order", () => {
    const data = buildWorkflowIntentData([
      {
        sessionId: "session-1",
        startedAt: 100,
        endedAt: 120,
        durationSeconds: 20,
        eventCount: 2,
        distinctProviderCount: 1,
        distinctActivityCount: 2,
        totalAmountAtomic: "100",
        providers: [],
        events: [],
      },
      {
        sessionId: "session-2",
        startedAt: 300,
        endedAt: 320,
        durationSeconds: 20,
        eventCount: 2,
        distinctProviderCount: 1,
        distinctActivityCount: 2,
        totalAmountAtomic: "100",
        providers: [],
        events: [],
      },
      {
        sessionId: "session-3",
        startedAt: 200,
        endedAt: 220,
        durationSeconds: 20,
        eventCount: 2,
        distinctProviderCount: 1,
        distinctActivityCount: 2,
        totalAmountAtomic: "100",
        providers: [],
        events: [],
      },
      {
        sessionId: "session-4",
        startedAt: 400,
        endedAt: 420,
        durationSeconds: 20,
        eventCount: 2,
        distinctProviderCount: 1,
        distinctActivityCount: 2,
        totalAmountAtomic: "100",
        providers: [],
        events: [],
      },
    ]);

    const result = selectLatestWorkflowIntentSessions(data);

    expect(result.sessions.map((session) => session.sessionId)).toEqual([
      "session-4",
      "session-2",
      "session-3",
    ]);
    expect(result.omittedCount).toBe(1);
  });

  test("adds backend omitted sessions to the local display cap", () => {
    const data = buildWorkflowIntentData(
      [
        {
          sessionId: "session-1",
          startedAt: 100,
          endedAt: 120,
          durationSeconds: 20,
          eventCount: 2,
          distinctProviderCount: 1,
          distinctActivityCount: 2,
          totalAmountAtomic: "100",
          providers: [],
          events: [],
        },
        {
          sessionId: "session-2",
          startedAt: 200,
          endedAt: 220,
          durationSeconds: 20,
          eventCount: 2,
          distinctProviderCount: 1,
          distinctActivityCount: 2,
          totalAmountAtomic: "100",
          providers: [],
          events: [],
        },
        {
          sessionId: "session-3",
          startedAt: 300,
          endedAt: 320,
          durationSeconds: 20,
          eventCount: 2,
          distinctProviderCount: 1,
          distinctActivityCount: 2,
          totalAmountAtomic: "100",
          providers: [],
          events: [],
        },
        {
          sessionId: "session-4",
          startedAt: 400,
          endedAt: 420,
          durationSeconds: 20,
          eventCount: 2,
          distinctProviderCount: 1,
          distinctActivityCount: 2,
          totalAmountAtomic: "100",
          providers: [],
          events: [],
        },
      ],
      2,
    );

    const result = selectLatestWorkflowIntentSessions(data);

    expect(result.sessions).toHaveLength(3);
    expect(result.omittedCount).toBe(3);
  });
});

describe("workflow intent display helpers", () => {
  test("removes generic input disclaimers from displayed text", () => {
    expect(
      cleanWorkflowIntentDisplayText(
        "This burst appears consistent with a pre-trade check. The input does not specify the exact downstream action.",
      ),
    ).toBe("This burst appears consistent with a pre-trade check.");
  });

  test("adds the USDC unit to session totals", () => {
    expect(formatWorkflowIntentSessionTotal("1250000")).toBe("1.250 USDC");
  });
});
