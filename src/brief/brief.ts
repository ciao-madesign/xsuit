// Localization brief (P5): what xsuit changed on one page, why, and with which limits, for people who
// want to localize their own pages. Built on the person's device from data they already have; the
// closed format keeps page text and address paths out of it (decision #62).

import { scanValue } from "../research/personal";
import type { EffectCatalog } from "../engine/types";
import type { Rule } from "../rules/types";
import type { ProfileChoice } from "../shared/settings";

export const BRIEF_SCHEMA = "xsuit.brief/1";
const STRUCTURAL = ["collapse", "reorder", "group", "surface-shortcut"];
const DESCENDANT_OK = ["img", "picture", "video", "a"];

export interface BriefCss {
  /** null = the block itself; otherwise a descendant (img, picture, video, a). */
  on: string | null;
  declaration: string;
}
export interface BriefChange {
  ruleId: string;
  title: string;
  dimension: string;
  pole: string;
  evidenceLevel: string;
  sources: string[];
  limit: string;
  elements: number;
  confidence: string;
  version: string;
  structural: boolean;
  css: BriefCss[];
}
export interface Brief {
  schema: typeof BRIEF_SCHEMA;
  createdOn: string;
  /** The site name only: no path, no query. */
  host: string;
  market: ProfileChoice;
  strength: string;
  depth: string;
  pageType: string;
  changes: BriefChange[];
  notApplied: { title: string; reason: string }[];
  unverifiable: number;
}

const RANK = { low: 1, medium: 2, high: 3 } as const;
type Conf = keyof typeof RANK;

function lowest(names: string[], known: Partial<Record<string, Conf>>): string {
  const seen = names.map((n) => known[n]).filter((x): x is Conf => !!x);
  return seen.length ? seen.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b)) : "n/a";
}

/** The CSS of a rule's effect at the strength in `catalog`. Structural rules have none. */
export function cssFor(rule: Rule, catalog: EffectCatalog): BriefCss[] {
  const a = rule.action;
  let base: string | null = null;
  if (a.type === "set-token") base = `${a.token}=${a.value}`;
  else if (a.type === "emphasize" || a.type === "de-emphasize")
    base = `${a.type}=${a.strength ?? "medium"}`;
  if (!base) return [];
  const out: BriefCss[] = [];
  for (const [key, decls] of Object.entries(catalog)) {
    const [b, desc] = key.split("@");
    if (b !== base) continue;
    if (desc !== undefined && !DESCENDANT_OK.includes(desc)) continue;
    for (const d of decls) out.push({ on: desc ?? null, declaration: d.trim() });
  }
  return out;
}

export interface BriefInput {
  host: string;
  now: Date;
  market: ProfileChoice;
  strength: string;
  depth: string;
  pageType: string;
  changes: { ruleId: string; elements: number }[];
  reverted: { ruleId: string; reason: string }[];
  unverifiable: number;
  rules: Rule[];
  components: Partial<Record<string, Conf>>;
  catalog: EffectCatalog;
}

export function buildBrief(i: BriefInput): Brief {
  const byId = new Map(i.rules.map((r) => [r.id, r]));
  const changes: BriefChange[] = i.changes
    .filter((c) => c.elements > 0 && byId.has(c.ruleId))
    .map((c) => {
      const r = byId.get(c.ruleId)!;
      return {
        ruleId: r.id,
        title: r.title,
        dimension: r.dimension,
        pole: r.pole,
        evidenceLevel: r.evidence.level,
        sources: [...new Set(r.evidence.sources.map((s) => s.id))],
        limit: r.evidence.gaps[0] ?? "",
        elements: c.elements,
        confidence: lowest(r.components, i.components),
        version: r.version,
        structural: STRUCTURAL.includes(r.action.type),
        css: cssFor(r, i.catalog),
      };
    });
  return {
    schema: BRIEF_SCHEMA,
    createdOn: i.now.toISOString().slice(0, 10),
    host: i.host.toLowerCase().slice(0, 253),
    market: i.market,
    strength: i.strength,
    depth: i.depth,
    pageType: i.pageType,
    changes,
    notApplied: i.reverted.map((x) => ({
      title: byId.get(x.ruleId)?.title ?? x.ruleId,
      reason: x.reason,
    })),
    unverifiable: i.unverifiable,
  };
}

const TOP = [
  "schema",
  "createdOn",
  "host",
  "market",
  "strength",
  "depth",
  "pageType",
  "changes",
  "notApplied",
  "unverifiable",
];
const CHANGE = [
  "ruleId",
  "title",
  "dimension",
  "pole",
  "evidenceLevel",
  "sources",
  "limit",
  "elements",
  "confidence",
  "version",
  "structural",
  "css",
];

/** Problems that stop a brief from being shown or saved; empty = fine. */
export function validateBrief(input: unknown): string[] {
  const out: string[] = [];
  if (typeof input !== "object" || input === null) return ["brief must be an object"];
  const b = input as Record<string, unknown>;
  for (const k of Object.keys(b)) if (!TOP.includes(k)) out.push(`field "${k}" is not allowed`);
  if (b.schema !== BRIEF_SCHEMA) out.push(`schema must be "${BRIEF_SCHEMA}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.createdOn))) out.push("createdOn must be YYYY-MM-DD");
  if (typeof b.host !== "string" || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(b.host))
    out.push("host must be a site name only (no path, query or port)");
  if (!Array.isArray(b.changes)) out.push("changes must be an array");
  else
    (b.changes as Record<string, unknown>[]).forEach((c, i) => {
      for (const k of Object.keys(c ?? {}))
        if (!CHANGE.includes(k)) out.push(`changes[${i}]: field "${k}" is not allowed`);
    });
  if (!Array.isArray(b.notApplied)) out.push("notApplied must be an array");
  out.push(...scanValue(b));
  return out;
}
