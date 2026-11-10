import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { defaultEffects } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { buildPlan, conflictKey, selectCandidates } from "../src/engine/plan";
import {
  checkConfiguration,
  configurationForRules,
  rulesForConfiguration,
  sanitizeConfiguration,
  type Dimension,
} from "../src/rules/configuration";
import type { Profile, RuleSet } from "../src/rules/types";
import { validateDimensions, validateProfile, validateRuleSet } from "../src/rules/validate";
import { normalizeSettings } from "../src/shared/settings";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const dims = load("rules/dimensions.json").dimensions as Dimension[];
const sets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];
const sources = load("rules/sources.json");
const rules = sets.flatMap((s) => s.rules);
const ajv = new Ajv({ strict: false, allErrors: true });

describe("dimensions registry", () => {
  it("is valid, by the schema and by the validator", () => {
    expect(validateDimensions(dims).ok).toBe(true);
    const ok = ajv.compile(load("schemas/dimensions.schema.json"));
    expect(ok(load("rules/dimensions.json")), JSON.stringify(ok.errors)).toBe(true);
  });
  it("rejects duplicates, bad families and empty dimensions", () => {
    expect(validateDimensions([dims[0], dims[0]]).ok).toBe(false);
    expect(validateDimensions([{ ...dims[0], family: "other" }]).ok).toBe(false);
    expect(validateDimensions([{ ...dims[0], poles: [] }]).ok).toBe(false);
    expect(validateDimensions([]).ok).toBe(false);
  });
  it("every pole is used by at least one rule, and every rule sits on a real pole", () => {
    for (const d of dims)
      for (const p of d.poles)
        expect(
          rules.some((r) => r.dimension === d.id && r.pole === p.id),
          `${d.id}/${p.id}`,
        ).toBe(true);
    for (const r of rules)
      expect(
        dims.find((d) => d.id === r.dimension)?.poles.some((p) => p.id === r.pole),
        r.id,
      ).toBe(true);
  });
  it("rule sets and profiles validate against the registry", () => {
    for (const s of sets) expect(validateRuleSet(s, sources, dims).errors, s.profile).toEqual([]);
    for (const p of profiles) expect(validateProfile(p, dims).errors, p.id).toEqual([]);
    const bad = { ...sets[0]!, rules: [{ ...sets[0]!.rules[0]!, pole: "nonsense" }] };
    expect(validateRuleSet(bad, sources, dims).ok).toBe(false);
    expect(
      validateProfile({ ...profiles[0], configuration: { density: "nonsense" } }, dims).ok,
    ).toBe(false);
    expect(validateProfile({ ...profiles[0], configuration: { mood: "happy" } }, dims).ok).toBe(
      false,
    );
  });
  it("the data files match their JSON schemas", () => {
    const rs = ajv.compile(load("schemas/rule.schema.json"));
    for (const r of rules) expect(rs(r), `${r.id} ${JSON.stringify(rs.errors)}`).toBe(true);
    const ps = ajv.compile(load("schemas/profile.schema.json"));
    for (const p of profiles) expect(ps(p), `${p.id} ${JSON.stringify(ps.errors)}`).toBe(true);
  });
  it("alternatives of one dimension exclude each other (they change the same thing)", () => {
    for (const d of dims) {
      const rs = rules.filter((r) => r.dimension === d.id);
      const polesWithRules = new Set(rs.map((r) => r.pole));
      if (polesWithRules.size < 2) continue;
      const keys = new Set(rs.map((r) => conflictKey(r)));
      expect(keys.size, `${d.id} must share one conflict key`).toBe(1);
      expect(keys.has(null), d.id).toBe(false);
    }
  });
});

describe("rule versions", () => {
  it("every rule is versioned, with a history that ends at its version", () => {
    for (const r of rules) {
      expect(r.version, r.id).toMatch(/^\d+\.\d+\.\d+$/);
      expect(r.history[r.history.length - 1]!.version, r.id).toBe(r.version);
      expect(r.introduced <= r.history[0]!.date, r.id).toBe(true);
      expect(r.lastReviewed === null || r.lastReviewed >= r.introduced, r.id).toBe(true);
    }
  });
  it("a history that does not end at the current version is rejected", () => {
    const r = { ...rules[0]!, version: "2.0.0" };
    expect(validateRuleSet({ ...sets[0]!, rules: [r] }, sources, dims).ok).toBe(false);
  });
});

describe("profiles are configurations", () => {
  it("Western and China select exactly the rules written for them", () => {
    for (const id of ["western", "china"] as const) {
      const p = profiles.find((x) => x.id === id)!;
      expect(rulesForConfiguration(p.configuration, rules).map((r) => r.id)).toEqual(
        rules.filter((r) => r.profile === id).map((r) => r.id),
      );
    }
  });
  it("Hybrid's default is the two rules it always had", () => {
    const sel = selectCandidates({ ruleSets: sets, profiles, profile: "hybrid" });
    expect(sel.map((r) => r.id).sort()).toEqual([
      "visual.china.image-led",
      "visual.western.search-first",
    ]);
  });
  it("choices win over the legacy rule list, and the legacy list still works alone", () => {
    const base = { ruleSets: sets, profiles, profile: "hybrid" as const };
    expect(
      selectCandidates({
        ...base,
        hybridChoices: { palette: "vivid" },
        hybridRuleIds: ["visual.western.muted-palette"],
      }).map((r) => r.id),
    ).toEqual(["visual.china.vivid-palette"]);
    expect(
      selectCandidates({ ...base, hybridRuleIds: ["visual.western.muted-palette"] }).map(
        (r) => r.id,
      ),
    ).toEqual(["visual.western.muted-palette"]);
    expect(selectCandidates({ ...base, hybridChoices: {} })).toEqual([]);
  });
  it("any choice of poles is conflict-free (200 random compositions)", () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 200; i++) {
      const choices: Record<string, string> = {};
      for (const d of dims) {
        const k = Math.floor(rnd() * (d.poles.length + 1));
        if (k < d.poles.length) choices[d.id] = d.poles[k]!.id;
      }
      const plan = buildPlan({
        ruleSets: sets,
        profiles,
        profile: "hybrid",
        depth: "structural",
        hybridChoices: choices,
        context: {
          pageType: "home",
          components: Object.fromEntries(
            [
              "hero",
              "carousel",
              "promo-banner",
              "search-box",
              "sidebar",
              "recommendations",
              "primary-nav",
              "product-card",
              "feed-item",
              "headline-list",
              "header",
              "footer",
              "article-body",
              "product-grid",
            ].map((c) => [c, "high"]),
          ),
          viewportWidth: 1280,
          metrics: { mediaPer1000Px: 5, mainBlocks: 2, peripheralBlocks: 0 },
        },
      });
      expect(
        plan.skipped.filter((s) => /conflicts with/.test(s.reason)),
        JSON.stringify(choices),
      ).toEqual([]);
      for (const e of plan.entries) expect(choices[e.rule.dimension], e.rule.id).toBe(e.rule.pole);
    }
  });
  it("bad stored choices cannot reach the planner", () => {
    expect(
      sanitizeConfiguration({ density: "compact", mood: "x", palette: "nope", hierarchy: 5 }, dims),
    ).toEqual({ density: "compact" });
    expect(rulesForConfiguration({ mood: "x" }, rules)).toEqual([]);
    expect(checkConfiguration({ density: "nope" }, dims).length).toBe(1);
    expect(
      normalizeSettings({ hybridChoices: { density: "compact", "Bad Key": "x", spacing: 5 } })
        .hybridChoices,
    ).toEqual({ density: "compact" });
    expect(normalizeSettings({ hybridChoices: "x" }).hybridChoices).toBeNull();
    expect(normalizeSettings({}).hybridChoices).toBeNull();
  });
  it("old rule-by-rule choices translate to dimensions", () => {
    expect(
      configurationForRules(
        ["visual.western.muted-palette", "visual.china.compact-density"],
        rules,
      ),
    ).toEqual({ palette: "muted", density: "compact" });
  });
});

describe("a new market is a configuration, not engine code", () => {
  const market: Profile = {
    id: "test-market" as never,
    name: "Test market",
    description: "Synthetic: calm colours, compact layout, quiet promotions.",
    version: "0.0.1",
    reliability: "hypothesis",
    evidenceRefs: ["project-synthesis"],
    configuration: {
      density: "compact",
      palette: "muted",
      promotions: "quiet",
      sidebar: "collapsed",
    },
  };
  it("is validated, planned and applied by the unchanged engine, and restores exactly", () => {
    // The only step that is vocabulary rather than engine: the id must be added to PROFILE_IDS (src/rules/vocab.ts).
    expect(validateProfile(market, dims).errors.map((e) => e.path)).toEqual(["id"]);
    expect(validateProfile({ ...market, id: "china" }, dims).errors).toEqual([]);
    const all = [...profiles, market];
    expect(
      selectCandidates({ ruleSets: sets, profiles: all, profile: "test-market" as never }).map(
        (r) => r.id,
      ),
    ).toEqual(
      [
        "visual.western.muted-palette",
        "visual.western.quiet-promos",
        "structure.western.collapse-sidebar",
        "visual.china.compact-density",
      ].sort((a, b) => rules.findIndex((r) => r.id === a) - rules.findIndex((r) => r.id === b)),
    );
    document.documentElement.innerHTML = readFileSync(
      join("tests/corpus", "news-article.html"),
      "utf8",
    );
    const before = document.documentElement.outerHTML;
    const a = analyzePage(document, null, "/news/2026/story-title");
    const engine = new Engine({
      doc: document,
      resolve: (c) => a.resolver(c),
      effects: defaultEffects,
    });
    engine.start({
      ruleSets: sets,
      profiles: all,
      profile: "test-market" as never,
      depth: "structural",
      context: { ...a.context, viewportWidth: 1280, metrics: { mediaPer1000Px: 40 } },
      disabledRules: [],
    });
    expect(engine.status.plan!.entries.length).toBeGreaterThan(0);
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });
});

describe("rules stay data: the engine does not mention a dimension or a market", () => {
  it("no dimension or pole id appears in engine or analyzer code", () => {
    const names = dims
      .flatMap((d) => [d.id, ...d.poles.map((p) => p.id)])
      .filter((n) => n.length > 5);
    for (const f of [
      "src/engine/plan.ts",
      "src/engine/apply.ts",
      "src/engine/engine.ts",
      "src/analyzer/index.ts",
    ]) {
      const code = readFileSync(f, "utf8").replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
      for (const n of names)
        expect(code, `${f} mentions "${n}"`).not.toMatch(new RegExp(`["'\`]${n}["'\`]`));
    }
  });
});
