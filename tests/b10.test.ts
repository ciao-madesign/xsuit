import { describe, expect, it } from "vitest";
import { buildReport } from "../src/report/report";
import type { Measurement } from "../src/metrics/metrics";

const m = (metrics: Record<string, number | null>, hasLayout = true) =>
  ({
    page: { host: "example.test", pageType: "home" },
    hasLayout,
    metrics,
  }) as unknown as Measurement;

const rules = [
  {
    id: "r1",
    title: "Rule one",
    version: "1.0.0",
    dimension: "density",
    pole: "compact",
    components: ["hero"],
    evidence: { level: "hypothesis", sources: [{ id: "li2026" }, { id: "li2026" }] },
  },
] as never;
const scorecard = { disclaimer: "d", rows: [] };

describe("comparison report", () => {
  it("computes deltas, lists rules with evidence, keeps no page text", () => {
    const r = buildReport({
      profile: "china",
      depth: "structural",
      pageType: "home",
      before: m({ a: 10, b: null, mainBlocks: 3 }),
      after: m({ a: 12.5, b: null, mainBlocks: 3 }),
      changes: [{ ruleId: "r1", elements: 2 }],
      reverted: [],
      skipped: [],
      allRules: rules,
      confidences: { hero: "medium", footer: "high" },
      scorecard,
    });
    expect(r.transformed).toBe(true);
    expect(r.metrics.find((x) => x.metric === "a")).toEqual({
      metric: "a",
      before: 10,
      after: 12.5,
      delta: 2.5,
    });
    expect(r.metrics.find((x) => x.metric === "b")!.delta).toBeNull();
    expect(r.rules).toEqual([
      {
        id: "r1",
        title: "Rule one",
        version: "1.0.0",
        dimension: "density",
        pole: "compact",
        evidence: "hypothesis",
        sources: ["li2026"],
        confidence: "medium",
        elements: 2,
      },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/\?|http/);
  });
  it("without a transformation there is no 'after'", () => {
    const r = buildReport({
      profile: "western",
      depth: "visual",
      pageType: "any",
      before: m({ a: 1 }),
      after: null,
      changes: [],
      reverted: [],
      skipped: [],
      allRules: rules,
      confidences: { hero: "medium", footer: "high" },
      scorecard,
    });
    expect(r.transformed).toBe(false);
    expect(r.metrics[0]!.after).toBeNull();
  });
});
