import type { CoUsageProviderRow } from "./co-usage-providers";

type OpportunityLevel = CoUsageProviderRow["opportunity"];

export function opportunityChipClass(level: OpportunityLevel): string {
  if (level === "high") return "chip blue";
  if (level === "medium") return "chip teal";
  return "chip mute";
}

export function opportunityLabel(level: OpportunityLevel): string {
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Low";
}
