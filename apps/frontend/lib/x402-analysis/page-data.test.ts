import { describe, expect, mock, test } from "bun:test";
import type { X402AnalysisViewModel } from "./transform";
import { getX402AnalysisViewModelForMode } from "./page-data";

function stubViewModel(label: string): X402AnalysisViewModel {
  return {
    category_definitions: [],
    endpoint_master: [],
    request_events_sample: [],
    sankey_flows_daily: [],
    sankey_flows: [],
    sankey_patterns: [],
    intermediary_summary: [],
    period_label: label,
    totals: {
      flow_count: 0,
      paid_count: 0,
      settled_usdc: 0,
      success_rate: 0,
      p95_latency_ms: 0,
      error_rate: 0,
    },
  };
}

describe("getX402AnalysisViewModelForMode", () => {
  test("uses the fallback model in sdk mode without calling the live builder", async () => {
    const live = mock<() => Promise<X402AnalysisViewModel>>(() =>
      Promise.resolve(stubViewModel("live")),
    );
    const fallback = mock<() => X402AnalysisViewModel>(() => stubViewModel("fallback"));

    const result = await getX402AnalysisViewModelForMode("sdkConnected", {
      buildLiveViewModel: live,
      buildFallbackViewModel: fallback,
    });

    expect(result.period_label).toBe("fallback");
    expect(live).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  test("uses the live model in on-chain mode when it succeeds", async () => {
    const live = mock<() => Promise<X402AnalysisViewModel>>(() =>
      Promise.resolve(stubViewModel("live")),
    );
    const fallback = mock<() => X402AnalysisViewModel>(() => stubViewModel("fallback"));

    const result = await getX402AnalysisViewModelForMode("onChainOnly", {
      buildLiveViewModel: live,
      buildFallbackViewModel: fallback,
    });

    expect(result.period_label).toBe("live");
    expect(live).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  test("falls back in on-chain mode when the live builder rejects", async () => {
    const live = mock<() => Promise<X402AnalysisViewModel>>(() =>
      Promise.reject(new Error("boom")),
    );
    const fallback = mock<() => X402AnalysisViewModel>(() => stubViewModel("fallback"));

    const result = await getX402AnalysisViewModelForMode("onChainOnly", {
      buildLiveViewModel: live,
      buildFallbackViewModel: fallback,
    });

    expect(result.period_label).toBe("fallback");
    expect(live).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
