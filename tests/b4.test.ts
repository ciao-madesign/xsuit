import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { adapters, buildContext, createResolver, findAdapter } from "../src/adapters";
import { buildCss, parseEffectKey, safeDeclaration } from "../src/engine/css";
import { defaultEffects, effectFile, FORBIDDEN_PROPERTIES } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { usesForbiddenProperty } from "../src/engine/forbidden";
import { buildPlan } from "../src/engine/plan";
import { formatIssues, validateAdapter } from "../src/rules";
import type { Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const western: RuleSet = load("rules/western.json");
const china: RuleSet = load("rules/china.json");
const profiles: Profile[] = load("rules/profiles.json");
const sources: { id: string }[] = load("rules/sources.json");
const allRules = [...western.rules, ...china.rules];

describe("effect catalog is justified and safe", () => {
  it("every effect has a basis, constraints and the rules it serves", () => {
    for (const e of effectFile.effects) {
      expect(e.basis.length, e.key).toBeGreaterThan(40);
      expect(e.constraints.length, e.key).toBeGreaterThan(0);
      expect(e.ruleIds.length, e.key).toBeGreaterThan(0);
      for (const id of e.ruleIds)
        expect(
          allRules.some((r) => r.id === id),
          `${e.key} -> ${id}`,
        ).toBe(true);
    }
  });
  it("source ids named in a basis exist in the registry", () => {
    const known = new Set(sources.map((s) => s.id));
    for (const e of effectFile.effects)
      for (const m of e.basis.matchAll(/\b(li2022|li2026|nng2016|wcag22)\b/g))
        expect(known.has(m[1]!)).toBe(true);
  });
  it("declarations are plain and avoid forbidden properties", () => {
    for (const e of effectFile.effects)
      for (const d of e.declarations) {
        expect(safeDeclaration(d), d).toBe(true);
        const prop = d.split(":")[0]!.trim().toLowerCase();
        expect(FORBIDDEN_PROPERTIES.includes(prop), `${e.key}: ${prop}`).toBe(false);
        expect(usesForbiddenProperty(d), `${e.key}: ${d}`).toBe(false);
      }
  });
  it("keys parse and the compact line height never goes below 1.4", () => {
    for (const e of effectFile.effects) expect(parseEffectKey(e.key), e.key).not.toBeNull();
    const lh = defaultEffects["density=compact"]!.find((d) => d.startsWith("line-height"))!;
    expect(parseFloat(lh.split(":")[1]!)).toBeGreaterThanOrEqual(1.4);
  });
  it("every visual action used by a shipped rule has an effect or an explained gap", () => {
    const covered = new Set(
      [...effectFile.effects, ...effectFile.intentionallyEmpty].map((e) => e.key.split("@")[0]),
    );
    for (const r of allRules) {
      const a = r.action;
      let key: string | null = null;
      if (a.type === "set-token") key = `${a.token}=${a.value}`;
      else if (a.type === "emphasize" || a.type === "de-emphasize")
        key = `${a.type}=${a.strength ?? "medium"}`;
      if (key) expect(covered.has(key), `${r.id} needs ${key}`).toBe(true);
    }
  });
  it("hypothesis-level rules never drive invented effects", () => {
    for (const e of effectFile.effects) {
      const levels = e.ruleIds.map((id) => allRules.find((r) => r.id === id)!.evidence.level);
      if (levels.every((l) => l === "hypothesis"))
        expect(e.basis.toLowerCase()).toContain("provisional");
    }
  });
});

describe("adapters", () => {
  it("validate", () => {
    for (const a of adapters) expect(formatIssues(validateAdapter(a).errors), a.id).toBe("");
  });
  it("are drafts and say they are unverified", () => {
    for (const a of adapters) {
      expect(a.status).toBe("draft");
      expect(a.notes).toContain("NOT verified");
    }
  });
  it("match hosts and subdomains only", () => {
    expect(findAdapter("www.google.com")?.id).toBe("site.google");
    expect(findAdapter("google.com")?.id).toBe("site.google");
    expect(findAdapter("news.baidu.com")).toBeNull(); // subdomains are never matched implicitly
    expect(findAdapter("sites.google.com")).toBeNull();
    expect(findAdapter("notgoogle.com")).toBeNull();
  });
  it("selectors are valid CSS", () => {
    document.documentElement.innerHTML = "<head></head><body></body>";
    for (const a of adapters)
      for (const c of a.components)
        for (const s of c.selectors) expect(() => document.querySelectorAll(s), s).not.toThrow();
  });
});

describe("visual transformations on the first adapters", () => {
  const setup = (file: string) => {
    document.documentElement.innerHTML = readFileSync(`tests/fixtures/${file}`, "utf8");
  };
  const run = (host: string, path: string, profile: "western" | "china") => {
    const adapter = findAdapter(host);
    const engine = new Engine({
      doc: document,
      resolve: createResolver(adapter, document),
      effects: defaultEffects,
      getContext: () => buildContext(adapter, document, path, 1280),
    });
    engine.start({
      ruleSets: [western, china],
      profiles,
      profile,
      depth: "visual",
      context: buildContext(adapter, document, path, 1280),
    });
    return engine;
  };

  beforeEach(() => setup("google-like.html"));

  it("Western profile changes the search page, then restores it exactly", () => {
    const before = document.documentElement.outerHTML;
    const engine = run("www.google.com", "/search", "western");
    const box = document.getElementById("sf")!;
    expect(box.getAttribute("data-xsuit-emph")).toBe("high");
    expect(document.getElementById("xsuit-style")!.textContent).toContain(
      "outline: 2px solid currentColor",
    );
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("China and Western profiles give visibly different results on the same page", () => {
    const w = run("www.google.com", "/search", "western");
    const wCss = document.getElementById("xsuit-style")!.textContent;
    w.restore();
    const c = run("www.google.com", "/search", "china");
    const cCss = document.getElementById("xsuit-style")?.textContent ?? "";
    c.restore();
    expect(wCss).not.toBe(cCss);
  });

  it("Unverified (low confidence) adapter selectors are not acted on, and the plan says why", () => {
    setup("baidu-like.html");
    const c = run("www.baidu.com", "/", "china");
    // The hot-search selector is a draft with low confidence, so the rule falls back to "skip".
    expect(document.getElementById("s-hotsearch-wrapper")!.hasAttribute("data-xsuit-emph")).toBe(
      false,
    );
    const reason = c.status.plan!.skipped.find(
      (x) => x.ruleId === "visual.china.discovery-feed",
    )?.reason;
    expect(reason).toContain("low confidence");
    c.restore();
  });

  it("sites without an adapter are left untouched", () => {
    document.documentElement.innerHTML = "<head></head><body><p>x</p></body>";
    const before = document.documentElement.outerHTML;
    const engine = run("example.org", "/", "china");
    expect(document.documentElement.outerHTML).toContain('data-xsuit="china"');
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("plan explains why unavailable rules were skipped", () => {
    const adapter = findAdapter("www.google.com");
    const plan = buildPlan({
      ruleSets: [western, china],
      profiles,
      profile: "western",
      depth: "visual",
      context: buildContext(adapter, document, "/search", 1280),
    });
    expect(plan.skipped.length).toBeGreaterThan(0);
    for (const s of plan.skipped) expect(s.reason.length).toBeGreaterThan(5);
  });

  it("generated CSS stays namespaced", () => {
    const adapter = findAdapter("www.google.com");
    const plan = buildPlan({
      ruleSets: [western, china],
      profiles,
      profile: "western",
      depth: "visual",
      context: buildContext(adapter, document, "/search", 1280),
    });
    for (const line of buildCss(plan, defaultEffects).split("\n"))
      expect(line.startsWith("html[data-xsuit] ")).toBe(true);
  });
});
