import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzePage } from "../src/analyzer";
import { buildBrief, BRIEF_SCHEMA, cssFor, validateBrief, type Brief } from "../src/brief/brief";
import { effectFile, toCatalog } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { DEFAULT_SETTINGS } from "../src/shared/settings";
import type { Profile, Rule, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];
const rules = ruleSets.flatMap((s) => s.rules) as Rule[];
const rule = (id: string) => rules.find((r) => r.id === id)!;

/** Adapts a real fixture page and builds the brief the content script would build. */
function briefFor(file: string, profile: "western" | "china", strength = "standard"): Brief {
  document.documentElement.innerHTML = readFileSync(`tests/fixtures/${file}`, "utf8");
  const a = analyzePage(document, null, "/private/path?token=abc");
  const catalog = toCatalog(effectFile, strength as "standard");
  const engine = new Engine({
    doc: document,
    resolve: (c) => a.resolver(c),
    a11yGuard: false,
    effects: catalog,
  });
  engine.start({
    ruleSets,
    profiles,
    profile,
    depth: "structural",
    context: {
      ...a.context,
      pageType: "home",
      viewportWidth: 1280,
      metrics: { mediaPer1000Px: 5 },
    },
  });
  const st = engine.status;
  const brief = buildBrief({
    host: "Shop.Example.com",
    now: new Date("2026-11-10T12:00:00Z"),
    market: profile,
    strength,
    depth: "structural",
    pageType: a.context.pageType,
    changes: st.changes,
    reverted: st.reverted,
    unverifiable: 0,
    rules,
    components: a.context.components,
    catalog,
  });
  engine.restore();
  return brief;
}

describe("building the brief", () => {
  it("lists what changed with reason, evidence, sources, limits and CSS", () => {
    const b = briefFor("dense.html", "china");
    expect(b.schema).toBe(BRIEF_SCHEMA);
    expect(b.createdOn).toBe("2026-11-10");
    expect(b.changes.length).toBeGreaterThan(0);
    for (const c of b.changes) {
      expect(c.sources.length, c.ruleId).toBeGreaterThan(0);
      expect(["strong", "moderate", "emerging", "hypothesis"]).toContain(c.evidenceLevel);
      expect(c.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
    const css = b.changes.filter((c) => c.css.length);
    expect(css.length).toBeGreaterThan(0);
    expect(validateBrief(b)).toEqual([]);
  });

  it("keeps the site name only: no path, query, or page text", () => {
    document.documentElement.innerHTML =
      "<body><main><h1>Secret headline UNIQUE-TEXT-42</h1></main></body>";
    const b = briefFor("dense.html", "western");
    const json = JSON.stringify(b);
    expect(b.host).toBe("shop.example.com");
    expect(json).not.toContain("private");
    expect(json).not.toContain("token=abc");
    expect(json).not.toContain("UNIQUE-TEXT-42");
    expect(validateBrief({ ...b, host: "shop.example.com/private?x=1" }).join(" ")).toMatch(/host/);
  });

  it("the CSS follows the strength, and structural changes say they have none", () => {
    const standard = cssFor(
      rule("visual.china.compact-density"),
      toCatalog(effectFile, "standard"),
    );
    const strong = cssFor(rule("visual.china.compact-density"), toCatalog(effectFile, "strong"));
    expect(standard.map((x) => x.declaration)).toContain("line-height: 1.4");
    expect(strong.map((x) => x.declaration)).toContain("line-height: 1.35");
    expect(cssFor(rule("structure.china.surface-shortcuts"), toCatalog())).toEqual([]);
    const img = cssFor(rule("visual.china.image-led"), toCatalog());
    expect(img.every((x) => x.on === "img")).toBe(true);
  });

  it("a page where nothing changed gives an empty brief, not an error", () => {
    const b = buildBrief({
      host: "example.com",
      now: new Date("2026-11-10T00:00:00Z"),
      market: "western",
      strength: "standard",
      depth: "visual",
      pageType: "any",
      changes: [],
      reverted: [],
      unverifiable: 0,
      rules,
      components: {},
      catalog: toCatalog(),
    });
    expect(b.changes).toEqual([]);
    expect(validateBrief(b)).toEqual([]);
  });
});

describe("the brief format is closed", () => {
  const ok = () => briefFor("dense.html", "china");
  it("refuses extra fields, wrong schema and personal data", () => {
    expect(validateBrief({ ...ok(), pageText: "hello" }).join(" ")).toMatch(/field "pageText"/);
    expect(validateBrief({ ...ok(), schema: "x" }).join(" ")).toMatch(/schema/);
    const b = ok();
    b.notApplied.push({ title: "t", reason: "write to mario@example.com" });
    expect(validateBrief(b).join(" ")).toMatch(/e-mail/);
    const c = ok();
    (c.changes[0] as unknown as Record<string, unknown>).screenshot = "data:";
    expect(validateBrief(c).join(" ")).toMatch(/field "screenshot"/);
  });
});

describe("the brief page", () => {
  afterEach(() => vi.unstubAllGlobals());
  async function open(brief: Brief | undefined, language = "auto") {
    vi.resetModules();
    document.documentElement.innerHTML = readFileSync("public/brief.html", "utf8")
      .replace(/<!doctype html>|<\/?html[^>]*>/gi, "")
      .replace(/<script[^>]*><\/script>/gi, "");
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: async () => ({ settings: { ...DEFAULT_SETTINGS, language } }),
          set: async () => undefined,
        },
        session: { get: async () => (brief ? { brief } : {}) },
        onChanged: { addListener() {} },
      },
    });
    await import("../src/brief/index");
    await new Promise((r) => setTimeout(r, 30));
  }

  it("shows each change in plain words with its reason, limits and CSS, plus the notes to read first", async () => {
    await open(briefFor("dense.html", "china"));
    const text = document.body.textContent!;
    expect(text).toContain("Localization brief");
    expect(text).toContain("shop.example.com");
    expect(text).toContain("Read this first");
    expect(text).toContain("not rules");
    expect(text).toContain("tested with your users");
    expect(text).toContain("Sites in this market usually do this.");
    expect(text).toContain("Approximate CSS for your own site");
    expect(text).toContain("Nothing was sent anywhere");
    expect(document.getElementById("print")).not.toBeNull();
    expect(document.getElementById("save")).not.toBeNull();
  });

  it("is in the person's language", async () => {
    await open(briefFor("dense.html", "china"), "it");
    expect(document.body.textContent).toContain("Scheda di localizzazione");
    expect(document.body.textContent).toContain("Da leggere prima");
  });

  it("an empty or tampered brief shows only the empty message", async () => {
    await open(undefined);
    expect(document.getElementById("summary")!.textContent).toMatch(/Nothing was changed/);
    const bad = { ...briefFor("dense.html", "china"), host: "a.com/secret" };
    await open(bad);
    expect(document.getElementById("changes")!.children.length).toBe(0);
  });

  it("works offline: the page uses only local files and no address with a network scheme", () => {
    const html = readFileSync("public/brief.html", "utf8");
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toMatch(/<script src="brief\.js"><\/script>/);
    expect(readFileSync("src/brief/index.ts", "utf8")).not.toMatch(
      /fetch\(|XMLHttpRequest|https?:\/\//,
    );
  });
});
