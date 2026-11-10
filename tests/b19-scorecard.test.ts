import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { defaultEffects } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { measurePage } from "../src/metrics/metrics";
import { buildReport } from "../src/report/report";
import { buildScorecard, nearestOf, type Baselines } from "../src/report/scorecard";
import { prepareReportExport } from "../src/research/exportGate";
import { checkReportFile } from "../src/research/privacy";
import type { Dimension } from "../src/rules/configuration";
import type { Profile, Rule, RuleSet } from "../src/rules/types";
import { METRIC_NAMES } from "../src/rules/vocab";
import { summarizeChanges } from "../src/ui/summary";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const dims = load("rules/dimensions.json").dimensions as Dimension[];
const baselines = load("rules/baselines.json").metrics as Baselines;
const profiles = load("rules/profiles.json") as Profile[];
const sets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const rules = sets.flatMap((s) => s.rules) as Rule[];
const sources = load("rules/sources.json") as { id: string }[];
const pages: { file: string; path: string }[] = load("tests/corpus/manifest.json");
const ajv = new Ajv({ strict: false, allErrors: true });
const validReport = ajv.compile(load("schemas/report.schema.json"));

describe("scorecard: descriptive, deterministic, honest", () => {
  const metrics = (v: Record<string, number | null>) => v as Record<string, unknown>;
  it("has one row per dimension and uses only real metric names", () => {
    const sc = buildScorecard(metrics({}), null, dims, baselines, profiles);
    expect(sc.rows.map((r) => r.dimension)).toEqual(dims.map((d) => d.id));
    for (const d of dims)
      for (const m of d.measures ?? []) expect(METRIC_NAMES as readonly string[]).toContain(m);
  });
  it("places a page between the two study samples by one transparent formula", () => {
    const at = (v: number) =>
      buildScorecard(metrics({ mediaPer1000Px: v }), null, dims, baselines, profiles).rows.find(
        (r) => r.dimension === "density",
      )!;
    expect(at(12.87).position!.before).toBe(0);
    expect(at(38.21).position!.before).toBe(1);
    expect(at(25.54).position!.before).toBeCloseTo(0.5, 2);
    expect(at(25.54).nearest!.before).toBe("in-between");
    expect(at(5).nearest!.before).toBe("western");
    expect(at(60).nearest!.before).toBe("china");
    expect(nearestOf(null)).toBeNull();
    expect(at(25).reference).toMatchObject({
      west: 12.87,
      china: 38.21,
      source: "li2026",
      provisional: true,
    });
  });
  it("gives a position only where the sources give a number; every other row says why not", () => {
    const sc = buildScorecard(
      metrics({
        mediaPer1000Px: 20,
        meanSaturation: 0.5,
        whitespaceRatio: 0.4,
        underlinedLinkRatio: 0.2,
      }),
      null,
      dims,
      baselines,
      profiles,
    );
    for (const r of sc.rows) {
      const hasNumber = r.measured.length > 0 && r.measured.some((m) => baselines[m.metric]);
      expect(r.position !== null, r.dimension).toBe(hasNumber);
      if (r.position === null) expect(r.note.length, r.dimension).toBeGreaterThan(20);
    }
    // a metric with a direction only (palette) is shown as measured, with no reference to compare
    const palette = sc.rows.find((r) => r.dimension === "palette")!;
    expect(palette.measured.find((m) => m.metric === "meanSaturation")!.before).toBe(0.5);
    expect(palette.reference).toBeNull();
  });
  it("handles a page that could not be measured (no layout): nulls, never invented numbers", () => {
    const sc = buildScorecard(metrics({ mediaPer1000Px: null }), null, dims, baselines, profiles);
    const d = sc.rows.find((r) => r.dimension === "density")!;
    expect(d.position).toEqual({ before: null, after: null });
    expect(d.nearest).toEqual({ before: null, after: null });
  });
  it("is deterministic on every corpus page", () => {
    for (const p of pages) {
      document.documentElement.innerHTML = readFileSync(join("tests/corpus", p.file), "utf8");
      const m = measurePage(document).metrics as unknown as Record<string, unknown>;
      const a = JSON.stringify(buildScorecard(m, m, dims, baselines, profiles));
      const b = JSON.stringify(buildScorecard(m, m, dims, baselines, profiles));
      expect(a, p.file).toBe(b);
    }
  });
  it("is never a quality score: no score, grade, rank or verdict anywhere", () => {
    const sc = buildScorecard(metrics({ mediaPer1000Px: 20 }), null, dims, baselines, profiles);
    const keys: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === "object" && v !== null)
        for (const [k, x] of Object.entries(v)) {
          keys.push(k);
          walk(x);
        }
    };
    walk(sc);
    expect(
      keys.filter((k) => /score|grade|rank|quality|rating|verdict|good|bad|better|worse/i.test(k)),
    ).toEqual([]);
    expect(JSON.stringify(sc.rows)).not.toMatch(/\b(better|worse|good|bad|best|worst)\b/i);
    expect(sc.disclaimer).toMatch(/not a measure of quality or usability/);
  });
});

/** The whole path: engine on a real page, then the report as the content script builds it. */
function realReport() {
  document.documentElement.innerHTML = readFileSync(join("tests/corpus", "shop-home.html"), "utf8");
  const before = measurePage(document);
  before.page.host = "example.com";
  const a = analyzePage(document, null, "/");
  const engine = new Engine({
    doc: document,
    resolve: (c) => a.resolver(c),
    effects: defaultEffects,
  });
  engine.start({
    ruleSets: sets,
    profiles,
    profile: "china",
    depth: "structural",
    context: { ...a.context, viewportWidth: 1280, metrics: before.metrics as never },
    disabledRules: [],
  });
  const st = engine.status;
  const after = measurePage(document);
  after.page.host = "example.com";
  const report = buildReport({
    profile: "china",
    depth: "structural",
    pageType: a.context.pageType,
    before,
    after,
    changes: st.changes,
    reverted: st.reverted,
    skipped: st.plan?.skipped ?? [],
    allRules: rules,
    confidences: a.context.components,
    scorecard: buildScorecard(
      before.metrics as never,
      after.metrics as never,
      dims,
      baselines,
      profiles,
    ),
  });
  engine.restore();
  return { report, st, a };
}

describe("explanation: every change links to a rule version, a dimension and a source", () => {
  it("each rule in the report carries version, dimension, pole, sources and recognition confidence", () => {
    const { report } = realReport();
    expect(report.rules.length).toBeGreaterThan(0);
    for (const x of report.rules) {
      const rule = rules.find((r) => r.id === x.id)!;
      expect(x.version).toBe(rule.version);
      expect(x.dimension).toBe(rule.dimension);
      expect(x.pole).toBe(rule.pole);
      expect(x.sources.length, x.id).toBeGreaterThan(0);
      for (const s of x.sources)
        expect(
          sources.map((k) => k.id),
          `${x.id} cites ${s}`,
        ).toContain(s);
      expect(["low", "medium", "high", "n/a"]).toContain(x.confidence);
    }
  });
  it("the report is valid in the closed schema and passes the export gate", () => {
    const { report } = realReport();
    expect(validReport(report), JSON.stringify(validReport.errors)).toBe(true);
    const res = checkReportFile(report);
    expect(res.problems).toEqual([]);
    expect(prepareReportExport(report).ok).toBe(true);
  });
  it("a score or any extra field cannot be added to the report", () => {
    const { report } = realReport();
    for (const bad of [
      { ...report, scorecard: { ...report.scorecard, score: 83 } },
      {
        ...report,
        scorecard: {
          ...report.scorecard,
          rows: report.scorecard.rows.map((r, i) => (i === 0 ? { ...r, grade: "A" } : r)),
        },
      },
      { ...report, rules: report.rules.map((r) => ({ ...r, comment: "hi" })) },
    ]) {
      expect(validReport(bad)).toBe(false);
      expect(checkReportFile(bad).ok).toBe(false);
    }
  });
  it("the on-page 'Why?' lists, for each change: what, why, evidence, sources, version, recognition, limit, how to turn off", () => {
    const { st, a } = realReport();
    const summary = summarizeChanges(st.changes, st.reverted, rules, a.context.components);
    expect(summary.reasons.length).toBeGreaterThan(0);
    for (const r of summary.reasons) {
      const rule = rules.find((x) => r.switchOff.includes(x.id))!;
      expect(rule, r.title).toBeDefined();
      expect(r.version).toBe(rule.version);
      expect(r.dimension).toBe(`${rule.dimension}: ${rule.pole}`);
      expect(r.description.length).toBeGreaterThan(10);
      expect(r.evidence.length).toBeGreaterThan(3);
      expect(r.sources.length).toBeGreaterThan(0);
      expect(r.limit.length).toBeGreaterThan(5);
      expect(["low", "medium", "high", "n/a"]).toContain(r.confidence);
      expect(r.switchOff).toContain("Options");
    }
  });
});
