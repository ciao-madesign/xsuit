import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { compatibility } from "../src/analyzer/compatibility";
import {
  contrastRatio,
  elementContrast,
  luminance,
  saturate,
  saturateFactor,
} from "../src/engine/a11y";
import { Engine } from "../src/engine/engine";
import { Journal } from "../src/engine/journal";
import { buildPlan } from "../src/engine/plan";
import type { Resolver } from "../src/engine/types";
import type { Adapter, Component, Profile, Rule, RuleSet } from "../src/rules/types";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/shared/settings";
import { Overlay } from "../src/ui/overlay";
import { summarizeChanges } from "../src/ui/summary";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const western: RuleSet = load("rules/western.json");
const china: RuleSet = load("rules/china.json");
const profiles: Profile[] = load("rules/profiles.json");
const effects = load("rules/effects.json");
const all = [...western.rules, ...china.rules];

describe("colour maths", () => {
  it("contrast of black on white is 21", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5);
  });
  it("saturate(1) changes nothing; saturate(0) gives a grey", () => {
    const c = { r: 200, g: 50, b: 80 };
    expect(saturate(c, 1)).toEqual(c);
    const g = saturate(c, 0);
    expect(Math.round(g.r)).toBe(Math.round(g.g));
    expect(Math.round(g.g)).toBe(Math.round(g.b));
  });
  it("parses saturate filters and refuses ones it cannot account for", () => {
    expect(saturateFactor("none")).toBe(1);
    expect(saturateFactor("saturate(0.8)")).toBeCloseTo(0.8);
    expect(saturateFactor("saturate(80%)")).toBeCloseTo(0.8);
    expect(saturateFactor("saturate(2) saturate(0.5)")).toBeCloseTo(1);
    expect(saturateFactor("blur(2px)")).toBeNull();
    expect(saturateFactor("saturate(2) blur(1px)")).toBeNull();
  });
  it("the correction is real: saturation filters CAN lower contrast, and the figures in effects.json are reproducible", () => {
    const levels = [0, 64, 128, 192, 255];
    const cols = levels.flatMap((r) => levels.flatMap((g) => levels.map((b) => ({ r, g, b }))));
    for (const row of effects.contrastSimulation.results as {
      filter: string;
      fallBelow4_5Percent: number;
    }[]) {
      const s = parseFloat(row.filter.match(/[\d.]+/)![0]);
      let total = 0;
      let below = 0;
      for (const t of cols)
        for (const b of cols) {
          if (contrastRatio(t, b) < 4.5) continue;
          total++;
          if (contrastRatio(saturate(t, s), saturate(b, s)) < 4.5) below++;
        }
      expect((below / total) * 100, row.filter).toBeCloseTo(row.fallBelow4_5Percent, 1);
    }
    expect(luminance({ r: 255, g: 0, b: 0 })).toBeGreaterThan(
      luminance(saturate({ r: 255, g: 0, b: 0 }, 0)),
    );
  });
});

describe("elementContrast", () => {
  const mk = (html: string) => {
    document.documentElement.innerHTML = `<head></head><body>${html}</body>`;
    return document.getElementById("t")!;
  };
  it("measures text against the nearest opaque background", () => {
    const el = mk(
      '<div style="background:rgb(255,255,255)"><p id="t" style="color:rgb(0,0,0)">hello</p></div>',
    );
    expect(elementContrast(el).ratio).toBeCloseTo(21, 3);
  });
  it("says 'not verifiable' for background images, no text and unknown filters", () => {
    expect(
      elementContrast(
        mk('<div id="t" style="background-image:linear-gradient(red,blue);color:#000">x</div>'),
      ).unverifiable,
    ).toContain("background");
    expect(elementContrast(mk('<div id="t"></div>')).unverifiable).toBe("no text");
    expect(
      elementContrast(mk('<div id="t" style="filter:blur(2px);color:#000">x</div>')).unverifiable,
    ).toContain("filters");
  });
});

describe("journal: undo one rule only", () => {
  it("rollbackTag restores just the tagged changes", () => {
    document.documentElement.innerHTML = "<head></head><body><p id='a' class='x'></p></body>";
    const a = document.getElementById("a")!;
    const j = new Journal();
    j.setAttr(a, "data-one", "1", "r1");
    j.setAttr(a, "data-two", "2", "r2");
    j.setAttr(a, "class", "y", "r1");
    j.rollbackTag("r1");
    expect(a.hasAttribute("data-one")).toBe(false);
    expect(a.getAttribute("class")).toBe("x");
    expect(a.getAttribute("data-two")).toBe("2");
    j.rollback();
    expect(a.hasAttribute("data-two")).toBe(false);
  });
});

describe("planner: rules turned off by the user", () => {
  it("skips them with a clear reason", () => {
    const base = {
      ruleSets: [western, china],
      profiles,
      profile: "china" as const,
      depth: "visual" as const,
      context: {
        pageType: "home" as const,
        components: {},
        viewportWidth: 1280,
        metrics: { mediaPer1000Px: 5 },
      },
    };
    expect(buildPlan(base).entries.map((e) => e.rule.id)).toContain("visual.china.vivid-palette");
    const p = buildPlan({ ...base, disabledRules: ["visual.china.vivid-palette"] });
    expect(p.entries.map((e) => e.rule.id)).not.toContain("visual.china.vivid-palette");
    expect(p.skipped.find((s) => s.ruleId === "visual.china.vivid-palette")!.reason).toContain(
      "turned off by you",
    );
  });
  it("settings keep only valid rule ids and label positions", () => {
    const s = normalizeSettings({
      disabledRules: ["visual.china.vivid-palette", "Bad Id", 5],
      labelPosition: "middle",
    });
    expect(s.disabledRules).toEqual(["visual.china.vivid-palette"]);
    expect(s.labelPosition).toBe(DEFAULT_SETTINGS.labelPosition);
    expect(normalizeSettings({ labelPosition: "hidden" }).labelPosition).toBe("hidden");
  });
});

describe("engine + accessibility guard", () => {
  // Low-contrast-prone pair: purple text on white drops below 4.5:1 under saturate(3).
  const html =
    '<head></head><body><div data-test="promo-banner" id="p" style="background:rgb(255,255,255);color:rgb(128,0,128)">Sale</div></body>';
  const resolver: Resolver = (c: Component) => [...document.querySelectorAll(`[data-test="${c}"]`)];
  const input = (profile: "china" | "western" = "china") => ({
    ruleSets: [western, china],
    profiles,
    profile,
    depth: "visual" as const,
    context: {
      pageType: "home" as const,
      components: { "promo-banner": "high" as const },
      viewportWidth: 1280,
      metrics: { mediaPer1000Px: 5 },
    },
  });
  beforeEach(() => {
    document.documentElement.innerHTML = html;
  });

  it("undoes a rule that measurably lowers contrast, and says why", () => {
    const harsh = { "emphasize=medium": ["filter: saturate(3)"] };
    const before = document.documentElement.outerHTML;
    const engine = new Engine({ doc: document, resolve: resolver, effects: harsh });
    engine.start(input());
    const st = engine.status;
    expect(st.reverted.map((r) => r.ruleId)).toContain("visual.china.prominent-promos");
    expect(st.reverted[0]!.reason).toContain("accessibility check");
    expect(st.reverted[0]!.reason).toContain("contrast");
    expect(document.getElementById("p")!.hasAttribute("data-xsuit-emph")).toBe(false);
    expect(st.changes.map((c) => c.ruleId)).not.toContain("visual.china.prominent-promos");
    expect(st.plan!.skipped.some((s) => s.ruleId === "visual.china.prominent-promos")).toBe(true);
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("keeps a rule whose effect does not hurt contrast", () => {
    const gentle = { "emphasize=medium": ["filter: saturate(1)"] };
    const engine = new Engine({ doc: document, resolve: resolver, effects: gentle });
    engine.start(input());
    expect(engine.status.reverted).toEqual([]);
    expect(document.getElementById("p")!.getAttribute("data-xsuit-emph")).toBe("medium");
    engine.restore();
  });

  it("a reverted rule is not re-applied when the page changes later", async () => {
    const harsh = { "emphasize=medium": ["filter: saturate(3)"] };
    const engine = new Engine({ doc: document, resolve: resolver, effects: harsh, debounceMs: 10 });
    engine.start(input());
    expect(engine.status.reverted.length).toBeGreaterThan(0);
    document.body.append(document.createElement("div"));
    await new Promise((r) => setTimeout(r, 60));
    expect(document.getElementById("p")!.hasAttribute("data-xsuit-emph")).toBe(false);
    engine.restore();
  });

  it("reports what it could not check instead of guessing", () => {
    document.documentElement.innerHTML =
      '<head></head><body><div data-test="promo-banner" id="p" style="background-image:linear-gradient(red,blue);color:#fff">Sale</div></body>';
    const engine = new Engine({
      doc: document,
      resolve: resolver,
      effects: { "emphasize=medium": ["filter: saturate(3)"] },
    });
    engine.start(input());
    expect(engine.status.reverted).toEqual([]); // kept (decision #34)
    expect(engine.status.report!.guard.unverifiable).toBeGreaterThan(0);
    engine.restore();
  });
});

describe("plain-language summary", () => {
  const byId = (id: string) => all.find((r) => r.id === id)!;
  it("lists only rules that changed something, with evidence label and sources", () => {
    const s = summarizeChanges(
      [
        { ruleId: "visual.china.vivid-palette", elements: 3 },
        { ruleId: "visual.china.tight-spacing", elements: 0 },
      ],
      [],
      all,
    );
    expect(s.count).toBe(1);
    expect(s.line).toBe("xsuit made 1 change: vivid palette.");
    expect(s.reasons[0]!.evidence).toBe("Moderate evidence");
    expect(s.reasons[0]!.sources.join(" ")).toContain("li2026");
    expect(byId("visual.china.vivid-palette")).toBeDefined();
  });
  it("shortens long lists and reports undone rules", () => {
    const changes = all.slice(0, 5).map((r) => ({ ruleId: r.id, elements: 1 }));
    const s = summarizeChanges(
      changes,
      [{ ruleId: all[6]!.id, reason: "undone by the accessibility check: x" }],
      all,
    );
    expect(s.line).toContain("and 2 more");
    expect(s.undone[0]!.title).toBe(all[6]!.title);
  });
  it("says nothing when nothing changed", () => {
    expect(summarizeChanges([], [], all).line).toBe("");
  });
  it("hypothesis rules are labelled as such", () => {
    const h = all.find((r) => r.evidence.level === "hypothesis")!;
    expect(
      summarizeChanges([{ ruleId: h.id, elements: 1 }], [], all).reasons[0]!.evidence,
    ).toContain("not yet validated");
  });
});

describe("on-page label", () => {
  let undone = 0;
  let overlay: Overlay;
  const summary = () =>
    summarizeChanges([{ ruleId: "visual.china.vivid-palette", elements: 2 }], [], all);
  beforeEach(() => {
    document.documentElement.innerHTML = "<head></head><body><p>page</p></body>";
    undone = 0;
    overlay = new Overlay(document, { onUndo: () => undone++ });
  });
  afterEach(() => overlay.hide());
  const host = () => document.querySelector("[data-xsuit-ui]") as HTMLElement | null;

  it("is one fixed-position element that does not touch page content", () => {
    const before = document.body.outerHTML;
    overlay.show(summary(), "bottom-left");
    expect(host()).not.toBeNull();
    expect(host()!.style.position).toBe("fixed");
    expect(host()!.style.left).toBe("12px");
    expect(document.body.outerHTML).toBe(before);
  });
  it("honours position and hidden", () => {
    overlay.show(summary(), "bottom-right");
    expect(host()!.style.right).toBe("12px");
    overlay.show(summary(), "hidden");
    expect(host()).toBeNull();
  });
  it("shows nothing when nothing changed", () => {
    overlay.show(summarizeChanges([], [], all), "bottom-left");
    expect(host()).toBeNull();
  });
  it("hide removes it completely", () => {
    overlay.show(summary(), "bottom-left");
    overlay.hide();
    expect(host()).toBeNull();
  });
  it("its shadow root is closed (page scripts cannot reach into it)", () => {
    overlay.show(summary(), "bottom-left");
    expect(host()!.shadowRoot).toBeNull();
  });
});

describe("compatibility indicator", () => {
  const adapter = (status: "draft" | "tested"): Adapter => ({
    id: "site.test",
    site: "t",
    hosts: ["example.com"],
    status,
    pageTypeHints: [],
    components: [{ component: "search-box", selectors: ["form"], confidence: "medium" }],
  });
  it("minimal / partial / full", () => {
    document.documentElement.innerHTML = "<head></head><body><div>x</div></body>";
    expect(compatibility(analyzePage(document, null, "/"), null).level).toBe("minimal");
    document.documentElement.innerHTML =
      "<head></head><body><footer><a href='/1'>1</a><a href='/2'>2</a><a href='/3'>3</a></footer></body>";
    expect(compatibility(analyzePage(document, null, "/"), null).level).toBe("partial");
    document.documentElement.innerHTML = "<head></head><body><form></form></body>";
    const draft = adapter("draft");
    // A draft adapter alone is only a low-confidence hint, so xsuit still understands too little.
    expect(compatibility(analyzePage(document, draft, "/"), draft)).toMatchObject({
      level: "minimal",
    });
    const tested = adapter("tested");
    expect(compatibility(analyzePage(document, tested, "/"), tested).level).toBe("full");
  });
  it("no shipped adapter is 'tested' yet, so none can claim Full", () => {
    for (const f of [
      "google",
      "baidu",
      "amazon",
      "taobao",
      "bbc",
      "guardian",
      "bilibili",
      "caixin",
      "youtube",
      "reddit",
      "weibo",
      "xiaohongshu",
    ])
      expect((load(`adapters/${f}.json`) as Adapter).status).toBe("draft");
  });
});

describe("every rule remains known to the summary and options", () => {
  it("rule titles exist", () => {
    for (const r of all as Rule[]) expect(r.title.length).toBeGreaterThan(3);
  });
});
