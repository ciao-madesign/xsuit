import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatIssues,
  validateAdapter,
  validateProfile,
  validateRule,
  validateRuleSet,
} from "../src/rules";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const westernSet = load("rules/western.json");
const chinaSet = load("rules/china.json");
const profiles = load("rules/profiles.json");
const sample = () => structuredClone(westernSet.rules[0]);

describe("shipped data", () => {
  it("rule sets validate", () => {
    for (const s of [westernSet, chinaSet]) {
      const r = validateRuleSet(s);
      expect(formatIssues(r.errors)).toBe("");
      expect(r.ok).toBe(true);
    }
  });
  it("has 15 to 20 initial rules, visual first", () => {
    const all = [...westernSet.rules, ...chinaSet.rules];
    expect(all.length).toBeGreaterThanOrEqual(15);
    expect(all.length).toBeLessThanOrEqual(20);
    expect(all.filter((r: { mode: string }) => r.mode === "visual").length).toBeGreaterThan(
      all.length / 2,
    );
  });
  it("rule ids are unique across profiles", () => {
    const ids = [...westernSet.rules, ...chinaSet.rules].map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("profiles validate and hybrid references existing rules", () => {
    const ids = new Set([...westernSet.rules, ...chinaSet.rules].map((r: { id: string }) => r.id));
    for (const p of profiles) {
      expect(validateProfile(p).ok).toBe(true);
      for (const c of p.composition ?? [])
        for (const id of c.ruleIds) expect(ids.has(id)).toBe(true);
    }
  });
});

describe("rule validation", () => {
  it("accepts a valid rule", () => expect(validateRule(sample()).ok).toBe(true));

  it("rejects protected elements", () => {
    const r = sample();
    r.components = ["payment-form"];
    const res = validateRule(r);
    expect(res.ok).toBe(false);
    expect(formatIssues(res.errors)).toContain("protected element");
  });
  it("rejects irreversible rules", () => {
    const r = sample();
    r.reversible = false;
    expect(validateRule(r).ok).toBe(false);
  });
  it("rejects missing evidence", () => {
    const r = sample();
    delete r.evidence;
    expect(formatIssues(validateRule(r).errors)).toContain("evidence");
  });
  it("rejects structural actions in visual mode", () => {
    const r = sample();
    r.action = { type: "collapse", target: "sidebar" };
    expect(formatIssues(validateRule(r).errors)).toContain("not allowed in mode");
  });
  it("rejects unknown token values with a clear message", () => {
    const r = sample();
    r.action = { type: "set-token", token: "density", value: "huge" };
    expect(formatIssues(validateRule(r).errors)).toContain("action.value");
  });
  it("rejects deep mode and high risk in V1", () => {
    const r = sample();
    r.mode = "deep";
    r.risk = "high";
    const msg = formatIssues(validateRule(r).errors);
    expect(msg).toContain("deep");
    expect(msg).toContain("high");
  });
  it("rejects non-objects and bad ids", () => {
    expect(validateRule(null).ok).toBe(false);
    const r = sample();
    r.id = "Bad Id";
    expect(validateRule(r).ok).toBe(false);
  });
});

describe("rule set validation", () => {
  it("rejects duplicate ids, wrong profile, unknown and circular dependencies", () => {
    const a = sample();
    const dup = { ...sample() };
    const wrong = { ...sample(), id: "visual.x.wrong", profile: "china" };
    const unknown = { ...sample(), id: "visual.x.unknown", dependencies: ["visual.nope.none"] };
    const res = validateRuleSet({
      profile: "western",
      version: "1",
      rules: [a, dup, wrong, unknown],
    });
    const msg = formatIssues(res.errors);
    expect(msg).toContain("duplicate");
    expect(msg).toContain("does not match");
    expect(msg).toContain("unknown dependency");

    const x = { ...sample(), id: "visual.x.a", dependencies: ["visual.x.b"] };
    const y = { ...sample(), id: "visual.x.b", dependencies: ["visual.x.a"] };
    const cyc = validateRuleSet({ profile: "western", version: "1", rules: [x, y] });
    expect(formatIssues(cyc.errors)).toContain("circular");
  });
});

describe("profile and adapter validation", () => {
  it("hybrid must list its composition; others must not", () => {
    expect(validateProfile({ ...profiles[2], composition: undefined }).ok).toBe(false);
    expect(validateProfile({ ...profiles[0], composition: [] }).ok).toBe(false);
  });
  const adapter = {
    id: "site.example",
    site: "Example",
    hosts: ["www.example.com"],
    status: "draft",
    pageTypeHints: [{ pageType: "home", urlPattern: "^/$" }],
    components: [{ component: "search-box", selectors: ["form[role=search]"], confidence: "high" }],
  };
  it("accepts a valid adapter", () => expect(validateAdapter(adapter).ok).toBe(true));
  it("rejects unsafe selectors, URLs as hosts and protected targets", () => {
    const bad = structuredClone(adapter);
    bad.components[0]!.selectors = ["a{background:url(http://x)}"];
    bad.hosts = ["https://www.example.com/path"];
    expect(validateAdapter(bad).ok).toBe(false);
    const prot = structuredClone(adapter) as Record<string, unknown>;
    prot.components = [{ component: "auth-form", selectors: ["form"], confidence: "high" }];
    expect(formatIssues(validateAdapter(prot).errors)).toContain("protected");
  });
});
