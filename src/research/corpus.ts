// B13: how well does recognition work on pages it has never seen, WITHOUT any site adapter?
// Every corpus page marks, in its HTML, the elements a person would call a component
// (`data-gt="header"`...). We compare what the generic analyzer recognizes with that ground truth.
// Only recognition with medium or high confidence counts as "usable": rules never act on low.

import { analyzePage } from "../analyzer";
import { compatibility } from "../analyzer/compatibility";

export const CORPUS_COMPONENTS = [
  "header",
  "primary-nav",
  "search-box",
  "footer",
  "sidebar",
  "article-body",
  "video-player",
  "carousel",
  "product-card",
] as const;
export type CorpusComponent = (typeof CORPUS_COMPONENTS)[number];

export interface CorpusPage {
  file: string;
  /** What kind of page it is, for the report: semantic, divsoup, trap, ... */
  kind: string;
  /** True page type, or "any" when it is none of the handled types. */
  pageType: string;
  path: string;
}

interface Counts {
  /** Usable (medium/high) recognized elements, and how many matched ground truth. */
  pred: number;
  predOk: number;
  /** Low-confidence recognized elements (never acted on). */
  low: number;
  /** Ground-truth elements, and how many a usable recognition found. */
  gt: number;
  gtFound: number;
}
export interface PageResult {
  page: CorpusPage;
  gotPageType: string;
  level: "full" | "partial" | "minimal";
  usableComponents: number;
  counts: Record<CorpusComponent, Counts>;
}

const related = (a: Element, b: Element) => a === b || a.contains(b) || b.contains(a);

export function evaluateDocument(doc: Document, page: CorpusPage): PageResult {
  const [pathname = "/", search = ""] = page.path.split("?");
  const analysis = analyzePage(doc, null, pathname, search ? `?${search}` : "");
  const counts = {} as Record<CorpusComponent, Counts>;
  let usableComponents = 0;
  for (const c of CORPUS_COMPONENTS) {
    const gt = [...doc.querySelectorAll(`[data-gt="${c}"]`)];
    const rec = analysis.recognized.find((r) => r.component === c);
    const usable = !!rec && rec.confidence !== "low";
    const els = rec ? analysis.resolver(c) : [];
    const ok = els.filter((e) => gt.some((g) => related(e, g)));
    if (usable) usableComponents++;
    counts[c] = {
      pred: usable ? els.length : 0,
      predOk: usable ? ok.length : 0,
      low: rec && !usable ? els.length : 0,
      gt: gt.length,
      gtFound: usable ? gt.filter((g) => els.some((e) => related(e, g))).length : 0,
    };
  }
  return {
    page,
    gotPageType: analysis.context.pageType,
    level: compatibility(analysis, null).level,
    usableComponents,
    counts,
  };
}

export interface ComponentSummary {
  component: CorpusComponent;
  pred: number;
  predOk: number;
  gt: number;
  gtFound: number;
  /** null when nothing was predicted / nothing to find. */
  precision: number | null;
  recall: number | null;
}
export interface Summary {
  pages: number;
  /** Recall split by whether the page was built with semantic markup (tags/roles) or without. */
  recallBySemantics: { semantic: number | null; nonSemantic: number | null };
  components: ComponentSummary[];
  overall: { precision: number | null; recall: number | null };
  pageType: {
    assigned: number;
    correct: number;
    precision: number | null;
    typed: number;
    coverage: number | null;
  };
  minimalPages: string[];
}

const ratio = (a: number, b: number) => (b === 0 ? null : a / b);

/** Page kinds built without semantic markup: recognition is expected to be weaker here. */
export const NON_SEMANTIC = new Set(["divsoup", "divsoup-cjk", "spa-shell", "heuristic", "app"]);

function recallOf(results: PageResult[]): number | null {
  let gt = 0;
  let found = 0;
  for (const r of results)
    for (const c of CORPUS_COMPONENTS) {
      gt += r.counts[c].gt;
      found += r.counts[c].gtFound;
    }
  return ratio(found, gt);
}

export function summarize(results: PageResult[]): Summary {
  const components = CORPUS_COMPONENTS.map((component) => {
    const s = { pred: 0, predOk: 0, gt: 0, gtFound: 0 };
    for (const r of results) {
      const c = r.counts[component];
      s.pred += c.pred;
      s.predOk += c.predOk;
      s.gt += c.gt;
      s.gtFound += c.gtFound;
    }
    return { component, ...s, precision: ratio(s.predOk, s.pred), recall: ratio(s.gtFound, s.gt) };
  });
  const sum = (k: "pred" | "predOk" | "gt" | "gtFound") => components.reduce((n, c) => n + c[k], 0);
  const assigned = results.filter((r) => r.gotPageType !== "any");
  const typed = results.filter((r) => r.page.pageType !== "any");
  const correct = assigned.filter((r) => r.gotPageType === r.page.pageType).length;
  return {
    pages: results.length,
    components,
    overall: {
      precision: ratio(sum("predOk"), sum("pred")),
      recall: ratio(sum("gtFound"), sum("gt")),
    },
    pageType: {
      assigned: assigned.length,
      correct,
      precision: ratio(correct, assigned.length),
      typed: typed.length,
      coverage: ratio(correct, typed.length),
    },
    recallBySemantics: {
      semantic: recallOf(results.filter((r) => !NON_SEMANTIC.has(r.page.kind))),
      nonSemantic: recallOf(results.filter((r) => NON_SEMANTIC.has(r.page.kind))),
    },
    minimalPages: results.filter((r) => r.level === "minimal").map((r) => r.page.file),
  };
}

const pct = (x: number | null) => (x === null ? "n/a" : `${Math.round(x * 100)}%`);

export function renderReport(results: PageResult[], s: Summary): string {
  const kinds = [...new Set(results.map((r) => r.page.kind))].sort();
  const wrong = results.filter((r) => r.gotPageType !== "any" && r.gotPageType !== r.page.pageType);
  return `# 16 — Generality report (B13): recognition without adapters

> Generated by \`npm run corpus\` from \`tests/corpus/\`. Do not edit by hand.

**What this measures.** The generic analyzer is run with **no site adapter** on ${s.pages} varied, synthetic, anonymous pages (kinds: ${kinds.join(", ")}). Ground truth is marked in each page's HTML (\`data-gt\`). Only medium/high confidence counts as "usable", because rules never act on low.

**Limits (read before quoting).** The pages are synthetic and were written by the project, so this shows regressions and gross errors, not performance on the real web. Real pages are measured in B14. A page cannot be both realistic and fully independent of the author's expectations; the corpus therefore includes deliberate traps (look-alike markup, hidden elements, nested asides).

## Components

| component | usable predictions | correct | precision | ground truth | found | recall |
|---|---|---|---|---|---|---|
${s.components.map((c) => `| ${c.component} | ${c.pred} | ${c.predOk} | ${pct(c.precision)} | ${c.gt} | ${c.gtFound} | ${pct(c.recall)} |`).join("\n")}
| **all** | ${s.components.reduce((n, c) => n + c.pred, 0)} | ${s.components.reduce((n, c) => n + c.predOk, 0)} | **${pct(s.overall.precision)}** | ${s.components.reduce((n, c) => n + c.gt, 0)} | ${s.components.reduce((n, c) => n + c.gtFound, 0)} | **${pct(s.overall.recall)}** |

Recall on pages with semantic markup: **${pct(s.recallBySemantics.semantic)}**; on pages built without it (div soup, apps, heuristics only): **${pct(s.recallBySemantics.nonSemantic)}**. The second number is the honest limit of generic recognition: where markup says nothing, xsuit does not guess.

Precision matters most: a wrong recognition can change the wrong element. Low recall only means xsuit leaves more of the page alone.

## Page type

Assigned a type on ${s.pageType.assigned} of ${s.pages} pages; correct on ${s.pageType.correct} (precision ${pct(s.pageType.precision)}). Of ${s.pageType.typed} pages that have a handled type, ${pct(s.pageType.coverage)} were typed correctly. Wrong types: ${wrong.length ? wrong.map((r) => `${r.page.file} (${r.gotPageType})`).join(", ") : "none"}.

## Pages where xsuit understands too little to act ("minimal")

${s.minimalPages.length ? s.minimalPages.map((f) => `- ${f}`).join("\n") : "none"}

On these pages no component rule runs: the engine does nothing, by design.

## Per page

| page | kind | type (true / found) | compatibility | usable components |
|---|---|---|---|---|
${results.map((r) => `| ${r.page.file} | ${r.page.kind} | ${r.page.pageType} / ${r.gotPageType} | ${r.level} | ${r.usableComponents} |`).join("\n")}
`;
}
