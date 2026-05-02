import type { DashboardMode } from "@/lib/data-mode";
import { buildX402LiveAnalysisViewModel } from "./live-data";
import { buildX402MockDataset, X402_CATEGORY_DEFINITIONS } from "./mock-data";
import { buildX402AnalysisViewModel, type X402AnalysisViewModel } from "./transform";

type X402ViewModelLoaders = {
  buildLiveViewModel: () => Promise<X402AnalysisViewModel>;
  buildFallbackViewModel: () => X402AnalysisViewModel;
};

const DEFAULT_LOADERS: X402ViewModelLoaders = {
  buildLiveViewModel: buildX402LiveAnalysisViewModel,
  buildFallbackViewModel: buildFallbackX402AnalysisViewModel,
};

export function buildFallbackX402AnalysisViewModel(): X402AnalysisViewModel {
  const dataset = buildX402MockDataset();
  return buildX402AnalysisViewModel({
    endpoint_master: dataset.endpoint_master,
    request_events: dataset.x402_request_events,
    sankey_flows_daily: dataset.sankey_flows_daily,
    category_definitions: X402_CATEGORY_DEFINITIONS,
  });
}

export async function getX402AnalysisViewModelForMode(
  mode: DashboardMode,
  loaders: X402ViewModelLoaders = DEFAULT_LOADERS,
): Promise<X402AnalysisViewModel> {
  if (mode !== "onChainOnly") {
    return loaders.buildFallbackViewModel();
  }

  try {
    return await loaders.buildLiveViewModel();
  } catch {
    return loaders.buildFallbackViewModel();
  }
}
