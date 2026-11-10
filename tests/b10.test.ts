import { describe, expect, it } from "vitest";
import { buildReport } from "../src/report/report";
import type { Measurement } from "../src/metrics/metrics";

const m = (metrics: Record<string, number | null>, hasLayout = true) =>
  ({
    page: { host: "example.test", path: "/" },
    hasLayout,
    metrics,
  }) as unknown as Measurement;

const rules = [{ id: "r1", title: "Rule one", evidence: { level: "hypothesis" } }] as never;

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
    });
    expect(r.transformed).toBe(true);
    expect(r.metrics.find((x) => x.metric === "a")).toEqual({
      metric: "a",
      before: 10,
      after: 12.5,
      delta: 2.5,
    });
    expect(r.metrics.find((x) => x.metric === "b")!.delta).toBeNull();
    expect(r.rules).toEqual([{ id: "r1", title: "Rule one", evidence: "hypothesis", elements: 2 }]);
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
    });
    expect(r.transformed).toBe(false);
    expect(r.metrics[0]!.after).toBeNull();
  });
});
