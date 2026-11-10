import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { countScripts, detectLanguage, scriptOf } from "../src/analyzer/language";
import { buildCss, CJK_MIN_LINE_HEIGHT, forScript } from "../src/engine/css";
import { defaultEffects, effectFile } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { usesForbiddenProperty } from "../src/engine/forbidden";
import { buildPlan, PHONE_MAX_WIDTH } from "../src/engine/plan";
import type { Component, Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];

/** Loads a full-document fixture, keeping the lang and dir the page sets on <html>. */
function loadFixture(name: string): void {
  const parsed = new DOMParser().parseFromString(
    readFileSync(`tests/fixtures/${name}`, "utf8"),
    "text/html",
  );
  for (const a of [...document.documentElement.attributes])
    document.documentElement.removeAttribute(a.name);
  for (const a of [...parsed.documentElement.attributes])
    document.documentElement.setAttribute(a.name, a.value);
  document.documentElement.innerHTML = parsed.documentElement.innerHTML;
}

function run(profile: "western" | "china", width = 1280, metrics = { mediaPer1000Px: 5 }) {
  const a = analyzePage(document, null, "/");
  // The fixtures are small: let the density rules reach the article so they have something to style.
  const resolve = (c: Component) => {
    const found = a.resolver(c);
    return found.length || !document.querySelector("article")
      ? found
      : [document.querySelector("article")!];
  };
  const engine = new Engine({ doc: document, resolve, a11yGuard: false, effects: defaultEffects });
  engine.start({
    ruleSets,
    profiles,
    profile,
    depth: "structural",
    context: { ...a.context, pageType: "home", viewportWidth: width, metrics },
  });
  return { engine, a };
}

beforeEach(() => {
  for (const a of [...document.documentElement.attributes])
    document.documentElement.removeAttribute(a.name);
  document.documentElement.innerHTML = "<head></head><body></body>";
});

describe("language and script detection", () => {
  it("classifies letters by script and ignores digits and punctuation", () => {
    expect(scriptOf("a".codePointAt(0)!)).toBe("latin");
    expect(scriptOf("é".codePointAt(0)!)).toBe("latin");
    expect(scriptOf("中".codePointAt(0)!)).toBe("cjk");
    expect(scriptOf("あ".codePointAt(0)!)).toBe("cjk");
    expect(scriptOf("한".codePointAt(0)!)).toBe("cjk");
    expect(scriptOf("ع".codePointAt(0)!)).toBe("arabic");
    expect(scriptOf("ש".codePointAt(0)!)).toBe("hebrew");
    expect(scriptOf("ж".codePointAt(0)!)).toBe("cyrillic");
    expect(scriptOf("7".codePointAt(0)!)).toBeNull();
    expect(scriptOf(".".codePointAt(0)!)).toBeNull();
    expect(countScripts("abc 123 中文").total).toBe(5);
  });

  it.each([
    ["cjk-zh.html", { lang: "zh", cjk: true, rtl: false, script: "cjk" }],
    ["cjk-ja.html", { lang: "ja", cjk: true, rtl: false, script: "cjk" }],
    ["rtl-arabic.html", { lang: "ar", cjk: false, rtl: true, rtlText: true, script: "arabic" }],
    ["long-words-de.html", { lang: "de", cjk: false, rtl: false, script: "latin" }],
  ])("reads %s", (file, want) => {
    loadFixture(file);
    expect(detectLanguage(document)).toMatchObject(want);
  });

  it("does not guess from too little text, and works without a lang attribute", () => {
    document.body.innerHTML = "<p>Hello</p>";
    expect(detectLanguage(document)).toMatchObject({ lang: null, script: null, cjk: false });
    document.body.innerHTML = `<p>${"中文内容".repeat(20)}</p>`;
    expect(detectLanguage(document)).toMatchObject({ lang: null, script: "cjk", cjk: true });
  });

  it("notices Arabic text on a page that forgot dir=rtl, without changing the direction", () => {
    document.body.innerHTML = `<p>${"مرحبا بكم في الصفحة ".repeat(6)}</p>`;
    const info = detectLanguage(document);
    expect(info.rtlText).toBe(true);
    expect(info.rtl).toBe(false);
  });

  it("reads only counts: the analysis keeps no text", () => {
    loadFixture("cjk-zh.html");
    const info = JSON.stringify(detectLanguage(document));
    expect(info).not.toContain("测试");
    const a = analyzePage(document, null, "/");
    expect(a.context.language?.cjk).toBe(true);
  });
});

describe("Chinese and Japanese text: line height never goes under the layout minimum", () => {
  it("raises line-height below 1.5, leaves everything else, and only on CJK pages", () => {
    expect(forScript("line-height: 1.4", true)).toBe(`line-height: ${CJK_MIN_LINE_HEIGHT}`);
    expect(forScript("line-height: 1.7", true)).toBe("line-height: 1.7");
    expect(forScript("gap: 0.5rem", true)).toBe("gap: 0.5rem");
    expect(forScript("line-height: 1.4", false)).toBe("line-height: 1.4");
  });

  it("the compact-density effect is 1.4 on Latin pages and 1.5 on CJK pages, with a note", () => {
    const plan = {
      entries: [{ rule: ruleSets[1]!.rules.find((r) => r.id === "visual.china.compact-density")! }],
      skipped: [],
    };
    expect(buildCss(plan, defaultEffects)).toContain("line-height: 1.4");
    const notes: string[] = [];
    const css = buildCss(plan, defaultEffects, "document", { cjk: true, notes });
    expect(css).toContain("line-height: 1.5");
    expect(css).not.toContain("line-height: 1.4");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/clreq/);
  });

  it("applies end to end on a Chinese page and on a Latin page, and restores both", () => {
    for (const [file, expected] of [
      ["cjk-zh.html", "line-height: 1.5"],
      ["cjk-ja.html", "line-height: 1.5"],
      ["long-words-de.html", "line-height: 1.4"],
    ] as const) {
      loadFixture(file);
      const before = document.documentElement.outerHTML;
      const { engine } = run("china");
      expect(document.getElementById("xsuit-style")?.textContent, file).toContain(expected);
      if (expected.endsWith("1.5")) expect(engine.status.report?.typography.length, file).toBe(1);
      engine.restore();
      expect(document.documentElement.outerHTML, file).toBe(before);
    }
  });
});

describe("right-to-left pages", () => {
  it("effects use logical properties only: physical left/right ones are refused", () => {
    for (const bad of [
      "margin-left: 4px",
      "padding-right: 2px",
      "border-left-width: 1px",
      "left: 0",
      "right: 0",
      "float: left",
      "text-align: left",
      "text-align: right",
    ])
      expect(usesForbiddenProperty(bad), bad).toBe(true);
    for (const good of [
      "margin-inline-start: 4px",
      "padding-block: 1rem",
      "text-align: start",
      "line-height: 1.5",
    ])
      expect(usesForbiddenProperty(good), good).toBe(false);
    for (const e of effectFile.effects)
      for (const d of e.declarations)
        expect(usesForbiddenProperty(d), `${e.key}: ${d}`).toBe(false);
  });

  it("adapting an Arabic page keeps its direction and restores it exactly", () => {
    loadFixture("rtl-arabic.html");
    const before = document.documentElement.outerHTML;
    const { engine } = run("western");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(engine.status.changes.length).toBeGreaterThan(0);
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("text added by xsuit is marked English and left-to-right; copied links keep their language", () => {
    loadFixture("rtl-arabic.html");
    document.querySelector("main")!.setAttribute("lang", "ar");
    const { engine } = run("china");
    const added = document.querySelectorAll("[data-xsuit-toggle], [data-xsuit-shortcuts]");
    for (const el of added) {
      expect(el.getAttribute("lang")).toBe("en");
    }
    for (const t of document.querySelectorAll("[data-xsuit-toggle]"))
      expect(t.getAttribute("dir")).toBe("ltr");
    for (const a of document.querySelectorAll("[data-xsuit-shortcuts] a"))
      expect(a.getAttribute("lang") ?? "ar").toBe("ar");
    engine.restore();
  });
});

describe("phones: device differences are not market differences", () => {
  const ctx = (viewportWidth: number) => ({
    pageType: "home" as const,
    components: { "headline-list": "high", hero: "high", "product-grid": "high" } as never,
    viewportWidth,
    metrics: { mediaPer1000Px: 60 },
  });
  const plan = (width: number) =>
    buildPlan({
      ruleSets,
      profiles,
      profile: "western",
      depth: "visual",
      context: ctx(width),
    });

  it("rules that compare a measurement with a desktop threshold do not run on a phone width", () => {
    const wide = plan(1280);
    const phone = plan(PHONE_MAX_WIDTH - 1);
    expect(wide.entries.some((e) => e.rule.id === "visual.western.spacious-density")).toBe(true);
    expect(phone.entries.some((e) => e.rule.id === "visual.western.spacious-density")).toBe(false);
    expect(
      phone.skipped.find((s) => s.ruleId === "visual.western.spacious-density")?.reason,
    ).toMatch(/device, not the market/);
  });

  it("rules without a measured threshold are not affected by the width", () => {
    const wide = plan(1280).entries.map((e) => e.rule.id);
    const phone = plan(390).entries.map((e) => e.rule.id);
    const measured = (id: string) =>
      ruleSets
        .flatMap((s) => s.rules)
        .find((r) => r.id === id)!
        .conditions.some((c) => c.type === "metric-above" || c.type === "metric-below");
    expect(phone).toEqual(wide.filter((id) => !measured(id)));
  });

  it("exactly at the limit the page counts as a desktop width", () => {
    expect(
      plan(PHONE_MAX_WIDTH).entries.some((e) => e.rule.id === "visual.western.spacious-density"),
    ).toBe(true);
  });
});

describe("no machine translation", () => {
  it("nothing in the extension calls a translation or language-detection service", () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".ts")) files.push(p);
      }
    };
    walk("src");
    for (const f of files) {
      const code = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(code, f).not.toMatch(
        /\bTranslator\b|LanguageDetector|i18n\.detectLanguage|translate\.googleapis|translation\.|\.translate\(/,
      );
    }
  });
});
