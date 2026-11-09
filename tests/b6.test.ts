import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPlan, needsMetrics, type PlanInput } from "../src/engine/plan";
import { measurePage } from "../src/metrics/metrics";
import { formatIssues, METRIC_NAMES, validateRule, validateRuleSet } from "../src/rules";
import type { Profile, Rule, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const western: RuleSet = load("rules/western.json");
const china: RuleSet = load("rules/china.json");
const profiles: Profile[] = load("rules/profiles.json");
const baselines = load("rules/baselines.json");
const sources: { id: string }[] = load("rules/sources.json");
const all = [...western.rules, ...china.rules];

const input = (
  profile: PlanInput["profile"],
  mediaPer1000Px: number | null | undefined,
): PlanInput => ({
  ruleSets: [western, china],
  profiles,
  profile,
  depth: "visual",
  context: {
    pageType: "home",
    components: {},
    viewportWidth: 1280,
    metrics: mediaPer1000Px === undefined ? undefined : { mediaPer1000Px },
  },
});
const ids = (p: ReturnType<typeof buildPlan>) => p.entries.map((e) => e.rule.id);
const why = (p: ReturnType<typeof buildPlan>, id: string) =>
  p.skipped.find((s) => s.ruleId === id)?.reason;

describe("metric conditions in rules", () => {
  it("the metric vocabulary matches what the metrics module really produces", () => {
    document.documentElement.innerHTML = "<head></head><body><p>x</p></body>";
    expect([...METRIC_NAMES].sort()).toEqual(Object.keys(measurePage(document).metrics).sort());
  });
  it("validator accepts valid and rejects invalid metric conditions", () => {
    const r = structuredClone(china.rules[0]) as Rule;
    expect(validateRule(r).ok).toBe(true);
    r.conditions = [{ type: "metric-below", metric: "nonsense", value: 3 }];
    expect(formatIssues(validateRule(r).errors)).toContain("conditions[0].metric");
    r.conditions = [{ type: "metric-above", metric: "mediaPer1000Px", value: "high" }];
    expect(formatIssues(validateRule(r).errors)).toContain("must be a number");
  });
  it("shipped rule sets still validate", () => {
    for (const s of [western, china])
      expect(formatIssues(validateRuleSet(s, sources as never).errors)).toBe("");
  });
});

describe("delta-based density rules", () => {
  const T = baselines.metrics.mediaPer1000Px.threshold as number;
  it("China compact applies only to pages sparser than the threshold", () => {
    expect(ids(buildPlan(input("china", 10)))).toContain("visual.china.compact-density");
    const dense = buildPlan(input("china", 38));
    expect(ids(dense)).not.toContain("visual.china.compact-density");
    expect(why(dense, "visual.china.compact-density")).toContain("already");
  });
  it("Western spacious applies only to pages denser than the threshold", () => {
    expect(ids(buildPlan(input("western", 38)))).toContain("visual.western.spacious-density");
    const sparse = buildPlan(input("western", 10));
    expect(ids(sparse)).not.toContain("visual.western.spacious-density");
    expect(why(sparse, "visual.western.spacious-density")).toContain("already");
  });
  it("the threshold itself changes nothing (strict comparison)", () => {
    expect(ids(buildPlan(input("china", T)))).not.toContain("visual.china.compact-density");
    expect(ids(buildPlan(input("western", T)))).not.toContain("visual.western.spacious-density");
  });
  it("nothing happens when the page could not be measured", () => {
    for (const m of [undefined, null]) {
      const p = buildPlan(input("china", m));
      expect(why(p, "visual.china.compact-density")).toContain("not measured");
    }
  });
  it("rules without a quantified baseline stay unconditional, as documented", () => {
    const p = buildPlan(input("china", 38));
    expect(ids(p)).toContain("visual.china.vivid-palette");
    expect(ids(p)).toContain("visual.china.tight-spacing");
  });
  it("measuring is requested only when a rule of the profile needs it", () => {
    const base = { ruleSets: [western, china], profiles };
    expect(needsMetrics({ ...base, profile: "china" })).toBe(true);
    expect(needsMetrics({ ...base, profile: "western" })).toBe(true);
    expect(needsMetrics({ ...base, profile: "original" })).toBe(false);
    expect(needsMetrics({ ...base, profile: "hybrid" })).toBe(false);
  });
});

describe("baselines are traceable and consistent", () => {
  it("every threshold is the midpoint of the two cited means", () => {
    for (const [name, b] of Object.entries<{ west: number; china: number; threshold: number }>(
      baselines.metrics,
    )) {
      expect(b.threshold, name).toBeCloseTo((b.west + b.china) / 2, 2);
    }
  });
  it("are provisional, cite a registered source and state their caveats", () => {
    expect(baselines.status).toBe("provisional");
    const known = new Set(sources.map((s) => s.id));
    for (const b of Object.values<{ source: { id: string; locator: string }; caveats: string[] }>(
      baselines.metrics,
    )) {
      expect(known.has(b.source.id)).toBe(true);
      expect(b.source.locator.length).toBeGreaterThan(10);
      expect(b.caveats.length).toBeGreaterThan(0);
    }
  });
  it("every metric condition in a rule uses a listed baseline value and is listed as used", () => {
    for (const r of all)
      for (const c of r.conditions) {
        if (c.type !== "metric-above" && c.type !== "metric-below") continue;
        const b = baselines.metrics[c.metric!];
        expect(b, `${r.id}: no baseline for ${c.metric}`).toBeDefined();
        expect(c.value, r.id).toBe(b.threshold);
        expect(b.usedByRules, r.id).toContain(r.id);
      }
  });
  it("rules that use a baseline say it is provisional in their gaps", () => {
    for (const r of all)
      if (r.conditions.some((c) => c.type === "metric-above" || c.type === "metric-below"))
        expect(r.evidence.gaps.join(" ")).toContain("provisional");
  });
});
