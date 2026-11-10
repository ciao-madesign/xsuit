import type { Adapter } from "../rules/types";
import type { Analysis } from "./index";

export type CompatibilityLevel = "full" | "partial" | "minimal";
export interface Compatibility {
  level: CompatibilityLevel;
  reason: string;
}

/** How well xsuit understands this page (research layer only, decision #35). */
export function compatibility(analysis: Analysis, adapter: Adapter | null): Compatibility {
  const c = base(analysis, adapter);
  const env = analysis.environment;
  if (!env) return c;
  const notes: string[] = [];
  if (env.shadowRoots)
    notes.push(`${env.shadowRoots} shadow root(s) read (only visual rules apply inside them)`);
  if (env.frames.readable + env.frames.blocked)
    notes.push(`${env.frames.readable + env.frames.blocked} frame(s) are never changed`);
  return notes.length ? { ...c, reason: `${c.reason} ${notes.join("; ")}.` } : c;
}

function base(analysis: Analysis, adapter: Adapter | null): Compatibility {
  const sure = analysis.recognized.filter((r) => r.confidence !== "low");
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
