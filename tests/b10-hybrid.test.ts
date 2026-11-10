import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hybridBlockedBy, withoutConflicts } from "../src/engine/hybrid";
import { buildPlan } from "../src/engine/plan";
import type { Profile, Rule, RuleSet } from "../src/rules/types";
import { normalizeSettings } from "../src/shared/settings";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const western: RuleSet = load("rules/western.json");
const china: RuleSet = load("rules/china.json");
const profiles: Profile[] = load("rules/profiles.json");
const all: Rule[] = [...western.rules, ...china.rules];

describe("hybrid composition", () => {
  it("uses exactly the rules the user selected", () => {
    const ids = ["visual.western.search-first"];
    const p = buildPlan({
      ruleSets: [western, china],
      profiles,
      profile: "hybrid",
      depth: "visual",
      hybridRuleIds: ids,
      context: {
        pageType: "home",
        components: { "search-box": "high" },
        viewportWidth: 1280,
        metrics: {},
      },
    });
    expect([...p.entries.map((e) => e.rule.id), ...p.skipped.map((s) => s.ruleId)]).toEqual(ids);
  });
  it("blocks a rule that changes the same thing as a selected one", () => {
    const keyed = all.filter((r) =>
      ["set-token", "emphasize", "de-emphasize"].includes(r.action.type),
    );
    const pair = keyed
      .flatMap((a) => keyed.filter((b) => a.id < b.id).map((b) => [a, b] as const))
      .find(([a, b]) => hybridBlockedBy(b.id, [a.id], all));
    expect(pair).toBeTruthy();
    expect(withoutConflicts([pair![0].id, pair![1].id], all)).toEqual([pair![0].id]);
  });
  it("settings keep only valid rule ids for the composition", () => {
    expect(normalizeSettings({ hybridRules: ["visual.x.y", "bad id", 3] }).hybridRules).toEqual([
      "visual.x.y",
    ]);
    expect(normalizeSettings({}).hybridRules).toBeNull();
  });
});
