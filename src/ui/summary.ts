import type { Rule } from "../rules/types";

export interface ReasonItem {
  title: string;
  description: string;
  /** Plain-language evidence label, never hidden. */
  evidence: string;
  sources: string[];
}

export interface ChangeSummary {
  count: number;
  line: string;
  reasons: ReasonItem[];
  undone: { title: string; reason: string }[];
}

const EVIDENCE_LABEL: Record<string, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  emerging: "Early evidence",
  hypothesis: "Hypothesis, not yet validated",
};

/** Plain-language summary of what changed, built only from rule data (nothing invented). */
export function summarizeChanges(
  changes: { ruleId: string; elements: number }[],
  reverted: { ruleId: string; reason: string }[],
  rules: Rule[],
): ChangeSummary {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const done = changes.filter((c) => c.elements > 0 && byId.has(c.ruleId));
  const reasons: ReasonItem[] = done.map((c) => {
    const r = byId.get(c.ruleId)!;
    return {
      title: r.title,
      description: r.description,
      evidence: EVIDENCE_LABEL[r.evidence.level] ?? r.evidence.level,
      sources: r.evidence.sources.map((s) => `${s.id}: ${s.locator}`),
    };
  });
  const undone = reverted.map((x) => ({
    title: byId.get(x.ruleId)?.title ?? x.ruleId,
    reason: x.reason,
  }));
  const count = reasons.length;
  const names = reasons.slice(0, 3).map((r) => r.title.toLowerCase());
  const more = count > 3 ? ` and ${count - 3} more` : "";
  const line =
    count === 0
      ? ""
      : `xsuit made ${count} change${count === 1 ? "" : "s"}: ${names.join(", ")}${more}.`;
  return { count, line, reasons, undone };
}
