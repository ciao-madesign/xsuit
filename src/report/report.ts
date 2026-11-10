import { safeFilePart, type Measurement } from "../metrics/metrics";
import type { Rule } from "../rules/types";

export const REPORT_SCHEMA = "xsuit.report/1";

export interface ReportRule {
  id: string;
  title: string;
  evidence: string;
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
  page: { host: string; path: string };
  profile: string;
  depth: string;
  pageType: string;
  /** False when nothing was applied: there is no "after" to compare. */
  transformed: boolean;
  rules: ReportRule[];
  undoneByGuard: { ruleId: string; reason: string }[];
  skipped: { ruleId: string; reason: string }[];
  metrics: ReportRow[];
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
  allRules: Pick<Rule, "id" | "title" | "evidence">[];
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
    page: { host: i.before.page.host, path: i.before.page.path },
    profile: i.profile,
    depth: i.depth,
    pageType: i.pageType,
    transformed: i.after !== null,
    rules: i.changes
      .filter((c) => c.elements > 0)
      .map((c) => ({
        id: c.ruleId,
        title: byId.get(c.ruleId)?.title ?? c.ruleId,
        evidence: byId.get(c.ruleId)?.evidence.level ?? "unknown",
        elements: c.elements,
      })),
    undoneByGuard: i.reverted,
    skipped: i.skipped,
    metrics: rows,
    notes,
  };
}

export function reportFileName(r: Report): string {
  return `${safeFilePart(r.page.host) || "page"}__${safeFilePart(r.profile)}__${r.createdAt.replace(/[:.]/g, "-")}.report.json`;
}
