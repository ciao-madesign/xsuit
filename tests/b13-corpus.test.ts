import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { defaultEffects } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { needsMetrics } from "../src/engine/plan";
import { measurePage } from "../src/metrics/metrics";
import {
  CORPUS_COMPONENTS,
  evaluateDocument,
  summarize,
  type CorpusPage,
  type PageResult,
  type Summary,
} from "../src/research/corpus";
import type { Profile, RuleSet } from "../src/rules/types";

const dir = "tests/corpus";
const pages: CorpusPage[] = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const html = (p: CorpusPage) => readFileSync(join(dir, p.file), "utf8");
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];

function open(p: CorpusPage): void {
  document.documentElement.innerHTML = html(p);
}

describe("corpus", () => {
  it("is large and varied enough to mean something", () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
    expect(new Set(pages.map((p) => p.kind)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(pages.map((p) => p.pageType)).size).toBeGreaterThanOrEqual(6);
  });
  it("contains no real site: no external links or resources", () => {
    for (const p of pages)
      expect(html(p), p.file).not.toMatch(/(src|href)="https?:\/\/(?!schema\.org)/);
  });
});

describe("recognition without any adapter (B13 thresholds)", () => {
  let results: PageResult[];
  let s: Summary;
  beforeAll(() => {
    results = pages.map((p) => {
      open(p);
      return evaluateDocument(document, p);
    });
    s = summarize(results);
  });

  it("precision: what it recognizes is right (a wrong element is worse than a missed one)", () => {
    expect(s.overall.precision!).toBeGreaterThanOrEqual(0.95);
    for (const c of s.components)
      if (c.pred >= 5) expect(c.precision!, c.component).toBeGreaterThanOrEqual(0.9);
  });
  it("page type: when it names a type, it is right", () => {
    expect(s.pageType.precision!).toBeGreaterThanOrEqual(0.95);
  });
  it("recall: regression floors (initial values from the first run; the real target is B14)", () => {
    expect(s.recallBySemantics.semantic!).toBeGreaterThanOrEqual(0.9);
    expect(s.overall.recall!).toBeGreaterThanOrEqual(0.85);
  });
  it("pages with nothing to go on are 'minimal', so nothing is applied", () => {
    for (const f of ["divsoup-shop.html", "spa-shell-empty.html"])
      expect(s.minimalPages, f).toContain(f);
  });
  it("every generic component has at least one example in the corpus", () => {
    for (const c of s.components) expect(c.gt, c.component).toBeGreaterThan(0);
    expect(CORPUS_COMPONENTS.length).toBe(9);
  });
});

describe("the whole engine, with adapter = null, on every corpus page", () => {
  const changedPages = new Set<string>();
  const configs = [
    ["western", "structural"],
    ["china", "structural"],
    ["hybrid", "visual"],
  ] as const;
  for (const p of pages) {
    it(`${p.file}: applies safely and restores exactly`, () => {
      open(p);
      const before = document.documentElement.outerHTML;
      for (const [profile, depth] of configs) {
        const [pathname = "/", search = ""] = p.path.split("?");
        let analysis = analyzePage(document, null, pathname, search ? `?${search}` : "");
        const input = { ruleSets, profiles, profile, hybridRuleIds: null };
        const metrics = needsMetrics(input)
          ? (measurePage(document).metrics as unknown as Partial<Record<string, number | null>>)
          : undefined;
        const engine = new Engine({
          doc: document,
          resolve: (c) => analysis.resolver(c),
          effects: defaultEffects,
          getContext: () => {
            analysis = analyzePage(document, null, pathname, search ? `?${search}` : "");
            return { ...analysis.context, viewportWidth: 1280, metrics };
          },
        });
        expect(() =>
          engine.start({
            ...input,
            depth,
            context: { ...analysis.context, viewportWidth: 1280, metrics },
            disabledRules: [],
          }),
        ).not.toThrow();
        if (engine.status.changes.length) changedPages.add(p.file);
        // Components rules never touch protected areas (login, payment).
        for (const el of document.querySelectorAll("input[type=password], [autocomplete^=cc-]"))
          expect(el.closest("[data-xsuit-collapsed], [data-xsuit-group]"), p.file).toBeNull();
        engine.restore();
        expect(document.documentElement.outerHTML, `${p.file} ${profile}`).toBe(before);
      }
    });
  }
  it("the restore check is not vacuous: rules really changed many pages", () => {
    expect(changedPages.size).toBeGreaterThanOrEqual(10);
  });
  it("a page xsuit does not understand gets no structural change", () => {
    for (const f of ["divsoup-shop.html", "spa-shell-empty.html"]) {
      const p = pages.find((x) => x.file === f)!;
      open(p);
      const analysis = analyzePage(document, null, "/", "");
      const engine = new Engine({ doc: document, resolve: (c) => analysis.resolver(c) });
      engine.start({
        ruleSets,
        profiles,
        profile: "china",
        depth: "structural",
        context: { ...analysis.context, viewportWidth: 1280 },
        disabledRules: [],
      });
      expect(
        document.querySelector("[data-xsuit-collapsed],[data-xsuit-shortcuts],[data-xsuit-group]"),
        f,
      ).toBeNull();
      engine.restore();
    }
  });
});

describe("generality: nothing is tied to a particular site", () => {
  const SITES =
    /\b(google|baidu|amazon|taobao|alibaba|bbc|guardian|bilibili|caixin|youtube|reddit|weibo|wechat|instagram|xiaohongshu|rednote|bing)\b/i;
  const files = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const x = join(d, f);
      return statSync(x).isDirectory() ? files(x) : x.endsWith(".ts") ? [x] : [];
    });
  it("analyzer and engine code never name a site", () => {
    for (const f of [...files("src/analyzer"), ...files("src/engine")]) {
      const code = readFileSync(f, "utf8").replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
      expect(code, f).not.toMatch(SITES);
    }
  });
  it("rules select by component, page type, condition and action only", () => {
    for (const set of ruleSets)
      for (const r of set.rules as unknown as Record<string, unknown>[]) {
        const machine = JSON.stringify([
          r.pageTypes,
          r.components,
          r.conditions,
          r.action,
          r.dependencies,
        ]);
        expect(machine, String(r.id)).not.toMatch(SITES);
        expect(machine, String(r.id)).not.toMatch(
          /"(host|hosts|site|sites|domain|url|selector|selectors)"/,
        );
      }
  });
});
