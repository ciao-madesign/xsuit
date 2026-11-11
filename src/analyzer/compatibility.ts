import type { Adapter } from "../rules/types";
import type { Analysis } from "./index";

export type CompatibilityLevel = "full" | "partial" | "minimal";
export interface Compatibility {
  level: CompatibilityLevel;
  reason: string;
}

/** How well xsuit understands this page (research layer only, decision #35). */
export function compatibility(analysis: Analysis, adapter: Adapter | null): Compatibility {
  // "page" is always present and says nothing about understanding the page.
  const sure = analysis.recognized.filter((r) => r.confidence !== "low" && r.component !== "page");
  const viaAdapter = analysis.recognized.some((r) => r.source === "adapter");
  if (adapter?.status === "tested" && viaAdapter) {
    return { level: "full", reason: "A tested site adapter matched this page." };
  }
  if (sure.length > 0) {
    const draft = adapter && viaAdapter ? " The site adapter is still a draft." : "";
    return {
      level: "partial",
      reason: `${sure.length} component(s) recognized with medium or high confidence; the rest is left alone.${draft}`,
    };
  }
  return {
    level: "minimal",
    reason: "No component recognized with enough confidence: only rules that work anywhere apply.",
  };
}
