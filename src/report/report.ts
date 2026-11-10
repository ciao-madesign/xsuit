import { safeFilePart, type Measurement } from "../metrics/metrics";
import type { Rule } from "../rules/types";
import type { Scorecard } from "./scorecard";

export const REPORT_SCHEMA = "xsuit.report/3";

/** One change, explained: what, why (dimension, pole, evidence, sources), how sure, which version. */
export interface ReportRule {
  id: string;
  title: string;
  version: string;
  dimension: string;
  pole: string;
  evidence: string;
  /** Source ids from the registry (rules/sources.json). */
  sources: string[];
  /** Lowest recognition confidence among the rule's components ("n/a" when none was recognized). */
  confidence: string;
  elements: number;
}

export interface ReportRow {
  metric: string;
  before: number | null;
  after: number | null;
  delta: number | null;
}

export interface Report {
  schema: typeof REPORT_SCHEMA;
  createdAt: string;
  /** Host and path only; never the query string or page text. */
  page: { host: string; pageType: string };
  profile: string;
  depth: string;
  pageType: string;
  /** False when nothing was applied: there is no "after" to compare. */
  transformed: boolean;
  rules: ReportRule[];
  undoneByGuard: { ruleId: string; reason: string }[];
  skipped: { ruleId: string; reason: string }[];
  metrics: ReportRow[];
  scorecard: Scorecard;
  notes: string[];
}

export interface ReportInput {
  now?: Date;
  profile: string;
  depth: string;
  pageType: string;
  before: Measurement;
  after: Measurement | null;
  changes: { ruleId: string; elements: number }[];
  reverted: { ruleId: string; reason: string }[];
  skipped: { ruleId: string; reason: string }[];
  allRules: Pick<
    Rule,
    "id" | "title" | "evidence" | "version" | "dimension" | "pole" | "components"
  >[];
  /** How sure xsuit was about each recognized component on this page. */
  confidences: Partial<Record<string, "low" | "medium" | "high">>;
  scorecard: Scorecard;
}

const RANK = { low: 1, medium: 2, high: 3 } as const;
function lowestConfidence(components: string[], known: ReportInput["confidences"]): string {
  const seen = components.map((c) => known[c]).filter((x): x is "low" | "medium" | "high" => !!x);
  if (!seen.length) return "n/a";
  return seen.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));
}

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);
const round = (n: number) => Math.round(n * 1000) / 1000;

export function buildReport(i: ReportInput): Report {
  const byId = new Map(i.allRules.map((r) => [r.id, r]));
  const rows: ReportRow[] = [];
  const b = i.before.metrics as unknown as Record<string, unknown>;
  const a = i.after ? (i.after.metrics as unknown as Record<string, unknown>) : null;
  for (const metric of Object.keys(b)) {
    const before = num(b[metric]);
    if (before === null && typeof b[metric] !== "object" && b[metric] !== null) continue;
    const after = a ? num(a[metric]) : null;
    rows.push({
      metric,
      before,
      after,
      delta: before !== null && after !== null ? round(after - before) : null,
    });
  }
  const notes = [
    "Metrics are the study-based indicators measured by xsuit (see definitions in a measurement file).",
    "Differences show what the transformation changed on this page; they are not a measure of usability.",
  ];
  if (!i.before.hasLayout) notes.push("No layout was available: size-based metrics are n/a.");
  if (i.after)
    notes.push("The 'after' numbers include elements xsuit adds (e.g. toggles, shortcuts).");
  return {
    schema: REPORT_SCHEMA,
    createdAt: (i.now ?? new Date()).toISOString(),
    page: { host: i.before.page.host, pageType: i.before.page.pageType },
    profile: i.profile,
    depth: i.depth,
    pageType: i.pageType,
    transformed: i.after !== null,
    rules: i.changes
      .filter((c) => c.elements > 0)
      .map((c) => {
        const r = byId.get(c.ruleId);
        return {
          id: c.ruleId,
          title: r?.title ?? c.ruleId,
          version: r?.version ?? "0.0.0",
          dimension: r?.dimension ?? "unknown",
          pole: r?.pole ?? "unknown",
          evidence: r?.evidence.level ?? "unknown",
          sources: [...new Set((r?.evidence.sources ?? []).map((s) => s.id))].sort(),
          confidence: lowestConfidence(r?.components ?? [], i.confidences),
          elements: c.elements,
        };
      }),
    undoneByGuard: i.reverted,
    skipped: i.skipped,
    metrics: rows,
    scorecard: i.scorecard,
    notes,
  };
}

export function reportFileName(r: Report): string {
  return `${safeFilePart(r.page.host) || "page"}__${safeFilePart(r.profile)}__${r.createdAt.replace(/[:.]/g, "-")}.report.json`;
}
