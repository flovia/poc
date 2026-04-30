import { describe, expect, test } from "bun:test";
import { describeSnapshotAge, type SnapshotAgeDescriptor } from "./freshness";

const NOW = Date.parse("2026-05-01T12:00:00.000Z");

describe("describeSnapshotAge", () => {
  test("returns 'just now' when generatedAt is within the last minute", () => {
    const result = describeSnapshotAge("2026-05-01T11:59:30.000Z", NOW);
    expect(result.relative).toBe("just now");
    expect(result.severity).toBe("fresh");
  });

  test("uses minutes for ages under one hour", () => {
    const result = describeSnapshotAge("2026-05-01T11:45:00.000Z", NOW);
    expect(result.relative).toBe("15m ago");
    expect(result.severity).toBe("fresh");
  });

  test("uses hours for ages under one day", () => {
    const result = describeSnapshotAge("2026-05-01T08:00:00.000Z", NOW);
    expect(result.relative).toBe("4h ago");
    expect(result.severity).toBe("fresh");
  });

  test("marks 24h–7d as stale", () => {
    const result = describeSnapshotAge("2026-04-29T12:00:00.000Z", NOW);
    expect(result.relative).toBe("2d ago");
    expect(result.severity).toBe("stale");
  });

  test("marks more than 7 days as outdated", () => {
    const result = describeSnapshotAge("2026-04-20T12:00:00.000Z", NOW);
    expect(result.relative).toBe("11d ago");
    expect(result.severity).toBe("outdated");
  });

  test("returns absolute date in tooltip-friendly form", () => {
    const result = describeSnapshotAge("2026-04-29T12:00:00.000Z", NOW);
    expect(result.absolute).toBe("2026-04-29T12:00:00.000Z");
  });

  test("treats invalid generatedAt as unknown", () => {
    const result: SnapshotAgeDescriptor = describeSnapshotAge("not-a-date", NOW);
    expect(result.relative).toBe("unknown");
    expect(result.severity).toBe("unknown");
    expect(result.absolute).toBeNull();
  });

  test("treats undefined as unknown", () => {
    const result = describeSnapshotAge(undefined, NOW);
    expect(result.relative).toBe("unknown");
    expect(result.severity).toBe("unknown");
  });

  test("treats future timestamps as fresh (clock skew tolerated)", () => {
    const result = describeSnapshotAge("2026-05-01T12:00:30.000Z", NOW);
    expect(result.relative).toBe("just now");
    expect(result.severity).toBe("fresh");
  });
});
