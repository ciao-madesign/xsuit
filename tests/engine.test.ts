import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCss, safeDeclaration } from "../src/engine/css";
import { Engine } from "../src/engine/engine";
import { buildPlan, type PlanInput } from "../src/engine/plan";
import { isProtected } from "../src/engine/protect";
import type { PageContext, Resolver } from "../src/engine/types";
import type { Component, Profile, Rule, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const western: RuleSet = load("rules/western.json");
const china: RuleSet = load("rules/china.json");
const profiles: Profile[] = load("rules/profiles.json");

const ctx = (over: Partial<PageContext> = {}): PageContext => ({
  pageType: "home",
  components: { hero: "high", carousel: "high", "promo-banner": "high", "search-box": "high" },
  viewportWidth: 1280,
  // A dense page, so the delta-based density rule for Western applies (see b6.test.ts for the rest).
  metrics: { mediaPer1000Px: 40 },
  ...over,
});
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  ruleSets: [western, china],
  profiles,
  profile: "western",
  depth: "visual",
  context: ctx(),
  ...over,
});
const ids = (p: ReturnType<typeof buildPlan>) => p.entries.map((e) => e.rule.id);
const why = (p: ReturnType<typeof buildPlan>, id: string) =>
  p.skipped.find((s) => s.ruleId === id)?.reason;

describe("plan", () => {
  it("original profile plans nothing", () => {
    expect(buildPlan(input({ profile: "original" })).entries).toEqual([]);
  });
  it("only selects rules of the chosen profile", () => {
    for (const e of buildPlan(input({ profile: "china" })).entries)
      expect(e.rule.profile).toBe("china");
  });
  it("visual depth skips structural rules, structural depth allows them", () => {
    const c = ctx({ components: { sidebar: "high", hero: "high" }, pageType: "article" });
    expect(why(buildPlan(input({ context: c })), "structure.western.collapse-sidebar")).toContain(
      "structural",
    );
    expect(ids(buildPlan(input({ context: c, depth: "structural" })))).toContain(
      "structure.western.collapse-sidebar",
    );
  });
  it("respects page type", () => {
    const p = buildPlan(input({ context: ctx({ pageType: "video" }) }));
    expect(why(p, "visual.western.quiet-carousel")).toContain("page type");
  });
  it("skips rules whose target component is not recognized", () => {
    const p = buildPlan(input({ context: ctx({ components: {} }) }));
    expect(why(p, "visual.western.quiet-promos")).toBe("target component not recognized");
    expect(why(p, "visual.western.search-first")).toContain("not found");
  });
  it("low confidence follows the rule's fallback", () => {
    const p = buildPlan(
      input({
        depth: "structural",
        context: ctx({ pageType: "article", components: { sidebar: "low" } }),
      }),
    );
    expect(why(p, "structure.western.collapse-sidebar")).toBeTruthy();
    expect(ids(p)).not.toContain("structure.western.collapse-sidebar");
  });
  it("token rules do not need recognized components", () => {
    expect(ids(buildPlan(input({ context: ctx({ components: {} }) })))).toContain(
      "visual.western.spacious-density",
    );
  });
  it("viewport condition", () => {
    const r = structuredClone(western.rules[0]) as Rule;
    r.id = "visual.test.wide";
    r.conditions = [{ type: "viewport-min-width", value: 1000 }];
    const set = { ...western, rules: [r] };
    expect(
      ids(buildPlan(input({ ruleSets: [set], context: ctx({ viewportWidth: 800 }) }))),
    ).toEqual([]);
    expect(ids(buildPlan(input({ ruleSets: [set] })))).toEqual(["visual.test.wide"]);
  });
  it("drops rules whose dependency is not applied", () => {
    const a = structuredClone(western.rules[0]) as Rule;
    const b = structuredClone(western.rules[1]) as Rule;
    a.id = "visual.test.a";
    b.id = "visual.test.b";
    b.dependencies = ["visual.test.a"];
    a.pageTypes = ["article"]; // a will not apply on home
    const p = buildPlan(input({ ruleSets: [{ ...western, rules: [a, b] }] }));
    expect(ids(p)).toEqual([]);
    expect(why(p, "visual.test.b")).toContain("dependency");
  });
  it("conflicts on the same token: higher priority wins, deterministically", () => {
    const a = structuredClone(western.rules[0]) as Rule;
    const b = structuredClone(western.rules[0]) as Rule;
    a.id = "visual.test.a";
    a.priority = 80;
    b.id = "visual.test.b";
    b.priority = 20;
    b.action = { type: "set-token", token: "density", value: "compact" };
    const p = buildPlan(input({ ruleSets: [{ ...western, rules: [b, a] }] }));
    expect(ids(p)).toEqual(["visual.test.a"]);
    expect(why(p, "visual.test.b")).toContain("conflicts");
  });
  it("hybrid uses only its explicit composition", () => {
    const p = buildPlan(input({ profile: "hybrid" }));
    expect(ids(p).sort()).toEqual(
      ["visual.china.image-led", "visual.western.search-first"]
        .filter((x) => ids(p).includes(x))
        .sort(),
    );
    for (const id of ids(p))
      expect(["visual.china.image-led", "visual.western.search-first"]).toContain(id);
  });
});

describe("protected elements", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = `<head></head><body>
      <header id="h"><input type="password" id="pw"></header>
      <form action="/login" id="login"><input id="u"></form>
      <div id="cookie-banner"><p id="cp">We use cookies</p></div>
      <section id="ok"><p id="okp">hello</p></section>
      <div id="pay"><input autocomplete="cc-number" id="cc"></div></body>`;
  });
  const el = (id: string) => document.getElementById(id)!;
  it("protects password, login, consent and payment areas", () => {
    for (const id of ["pw", "login", "u", "cookie-banner", "cp", "cc", "pay"])
      expect(isProtected(el(id)), id).toBe(true);
  });
  it("protects containers that hold protected content", () =>
    expect(isProtected(el("h"))).toBe(true));
  it("leaves ordinary content alone", () => {
    expect(isProtected(el("ok"))).toBe(false);
    expect(isProtected(el("okp"))).toBe(false);
  });
});

describe("namespaced CSS", () => {
  it("scopes every selector and rejects unsafe declarations", () => {
    const p = buildPlan(input());
    const css = buildCss(p, {
      "density=spacious": ["line-height: 1.7"],
      "de-emphasize=medium": ["opacity: .8", "background: url(http://x)", "} body {x:y"],
    });
    expect(css).toContain("line-height: 1.7");
    expect(css).not.toContain("url(");
    expect(css).not.toContain("body");
    for (const line of css.split("\n")) expect(line.startsWith("html[data-xsuit] ")).toBe(true);
  });
  it("is empty when the catalog is empty (no unjustified styling)", () => {
    expect(buildCss(buildPlan(input()), {})).toBe("");
  });
  it("accepts only plain declarations", () => {
    expect(safeDeclaration("padding: 4px")).toBe(true);
    for (const bad of ["a{b:c}", "x: url(y)", "@import 'x'", "behavior: expression(1)", "nonsense"])
      expect(safeDeclaration(bad)).toBe(false);
  });
});

describe("engine: apply, restore, idempotency", () => {
  const effects = {
    "density=spacious": ["line-height: 1.7"],
    "de-emphasize=medium": ["opacity: 0.85"],
  };
  const resolver: Resolver = (c: Component) => [...document.querySelectorAll(`[data-test="${c}"]`)];
  const html = `<head><title>t</title></head><body>
    <div data-test="hero" id="hero">Hero</div>
    <div data-test="promo-banner" id="promo">Promo</div>
    <div data-test="carousel" id="car" style="color:red">Car</div>
    <form action="/login"><div data-test="hero" id="hero2"><input type="password"></div></form></body>`;
  beforeEach(() => {
    document.documentElement.innerHTML = html;
  });

  it("restore returns the page exactly to its original state", () => {
    const before = document.documentElement.outerHTML;
    const engine = new Engine({ doc: document, resolve: resolver, effects });
    engine.start(input());
    expect(document.documentElement.outerHTML).not.toBe(before);
    expect(document.getElementById("xsuit-style")).not.toBeNull();
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("applying twice changes nothing the second time", () => {
    const engine = new Engine({ doc: document, resolve: resolver, effects });
    engine.start(input());
    const once = document.documentElement.outerHTML;
    // Re-run through a second start: state is kept per engine, so use the same engine's observer path.
    engine.start(input());
    expect(document.documentElement.outerHTML).toBe(once);
    engine.restore();
  });

  it("never touches protected elements and reports them", () => {
    const engine = new Engine({ doc: document, resolve: resolver, effects });
    engine.start(input());
    expect(document.getElementById("hero2")!.hasAttribute("data-xsuit-c")).toBe(false);
    expect(engine.status.report!.protectedSkipped).toBeGreaterThan(0);
    engine.restore();
  });

  it("runs structural actions without reporting them as unsupported", () => {
    document.documentElement.innerHTML = `<head></head><body><aside data-test="sidebar">s</aside></body>`;
    const engine = new Engine({ doc: document, resolve: resolver, effects });
    engine.start(
      input({
        depth: "structural",
        profile: "china",
        context: ctx({ components: { hero: "high", recommendations: "high" } }),
      }),
    );
    expect(engine.status.report!.unsupported).toEqual([]);
    engine.restore();
  });
});

describe("engine: dynamic pages and loop guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.innerHTML = `<head></head><body><div id="root"><div data-test="promo-banner" id="p1">a</div></div></body>`;
  });
  afterEach(() => vi.useRealTimers());
  const resolver: Resolver = (c) => [...document.querySelectorAll(`[data-test="${c}"]`)];
  const effects = { "de-emphasize=medium": ["opacity: 0.85"] };

  it("handles content added later, once per burst", async () => {
    const engine = new Engine({ doc: document, resolve: resolver, effects, debounceMs: 50 });
    engine.start(input());
    const runs = engine.status.runs;
    const root = document.getElementById("root")!;
    for (let i = 0; i < 5; i++) {
      const d = document.createElement("div");
      d.dataset.test = "promo-banner";
      d.id = `n${i}`;
      root.append(d);
    }
    await vi.advanceTimersByTimeAsync(200);
    expect(engine.status.runs).toBe(runs + 1);
    for (let i = 0; i < 5; i++)
      expect(document.getElementById(`n${i}`)!.hasAttribute("data-xsuit-deemph")).toBe(true);
    engine.restore();
  });

  it("its own changes do not trigger it again", async () => {
    const engine = new Engine({ doc: document, resolve: resolver, effects, debounceMs: 50 });
    engine.start(input());
    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.status.runs).toBe(1);
    engine.restore();
  });

  it("stops when the page keeps changing without end (loop guard)", async () => {
    let t = 0;
    const engine = new Engine({
      doc: document,
      resolve: resolver,
      effects,
      debounceMs: 10,
      maxRuns: 5,
      windowMs: 10_000,
      now: () => t,
    });
    engine.start(input());
    const root = document.getElementById("root")!;
    // A page script that adds a node every time anything is added: endless churn.
    const churn = new MutationObserver(() =>
      setTimeout(() => root.append(document.createElement("i")), 5),
    );
    churn.observe(root, { childList: true });
    root.append(document.createElement("i"));
    for (let i = 0; i < 40; i++) {
      t += 20;
      await vi.advanceTimersByTimeAsync(20);
    }
    churn.disconnect();
    expect(engine.status.guardTripped).toBe(true);
    expect(engine.status.runs).toBeLessThanOrEqual(6);
    engine.restore();
  });
});
