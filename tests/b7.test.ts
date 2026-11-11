import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { findAdapter } from "../src/adapters";
import { analyzePage } from "../src/analyzer";
import { recognizeComponents } from "../src/analyzer/components";
import { classifyPage } from "../src/analyzer/pageType";
import { buildPlan } from "../src/engine/plan";
import type { Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const western: RuleSet = load("rules/western.json");
const china: RuleSet = load("rules/china.json");
const profiles: Profile[] = load("rules/profiles.json");
const page = (name: string) => {
  document.documentElement.innerHTML = readFileSync(`tests/fixtures/${name}`, "utf8");
};

describe("generic component recognition", () => {
  beforeEach(() => page("article-generic.html"));

  it("recognizes semantic components and explains each one", () => {
    const r = recognizeComponents(document);
    for (const c of [
      "header",
      "primary-nav",
      "search-box",
      "footer",
      "sidebar",
      "article-body",
    ] as const) {
      expect(r[c], c).toBeDefined();
      expect(r[c]!.signals.length, c).toBeGreaterThan(0);
    }
  });
  it("confidence grows with corroborating signals", () => {
    const r = recognizeComponents(document);
    expect(r.header!.confidence).toBe("high"); // header tag + contains navigation
    expect(r["primary-nav"]!.confidence).toBe("high"); // nav tag + links + inside header
    expect(r.sidebar!.confidence).toBe("medium"); // single semantic signal
    expect(r["search-box"]!.confidence).toBe("high"); // role search + input type search + name q
  });
  it("ignores hidden elements", () => {
    document.querySelector("aside")!.setAttribute("hidden", "");
    expect(recognizeComponents(document).sidebar).toBeUndefined();
  });
  it("does not recognize what it cannot justify (div soup)", () => {
    page("div-soup.html");
    const r = recognizeComponents(document);
    expect(Object.keys(r)).toEqual(["page"]); // only the whole page, which needs no justification
  });
  it("search box: heuristics alone never reach high", () => {
    document.documentElement.innerHTML =
      '<body><form><input name="q" placeholder="Search the site"></form></body>';
    expect(recognizeComponents(document)["search-box"]!.confidence).toBe("medium"); // two hints
    document.documentElement.innerHTML = '<body><form><input name="q"></form></body>';
    expect(recognizeComponents(document)["search-box"]!.confidence).toBe("low"); // one hint
    document.documentElement.innerHTML =
      '<body><form><input name="email" placeholder="Email"></form></body>';
    expect(recognizeComponents(document)["search-box"]).toBeUndefined();
  });
  it("carousel: ARIA beats class heuristic", () => {
    document.documentElement.innerHTML =
      '<body><div aria-roledescription="carousel"><button aria-label="Next slide"></button></div><div class="swiper"></div></body>';
    const c = recognizeComponents(document).carousel!;
    expect(c.confidence).toBe("high");
    expect(c.signals.join(" ")).toContain("aria-roledescription");
    document.documentElement.innerHTML = '<body><div class="swiper"></div></body>';
    expect(recognizeComponents(document).carousel!.confidence).toBe("low");
    document.documentElement.innerHTML = '<body><div class="my-slider-thing"></div></body>';
    expect(recognizeComponents(document).carousel).toBeUndefined();
  });
  it("page-level header only: a header inside an article is not the page header", () => {
    document.documentElement.innerHTML =
      "<body><article><header><h1>t</h1></header></article></body>";
    expect(recognizeComponents(document).header).toBeUndefined();
  });
  it("is read-only: the page is not changed", () => {
    const before = document.documentElement.outerHTML;
    recognizeComponents(document);
    expect(document.documentElement.outerHTML).toBe(before);
  });
});

describe("page type classifier (two independent signals)", () => {
  it("article: og:type + article element", () => {
    page("article-generic.html");
    const c = classifyPage(document, "/some/page", "");
    expect(c.pageType).toBe("article");
    expect(c.confident).toBe(true);
  });
  it("one signal is not enough", () => {
    document.documentElement.innerHTML =
      '<head><meta property="og:type" content="article"></head><body><p>x</p></body>';
    const c = classifyPage(document, "/nothing", "");
    expect(c.pageType).toBe("any");
    expect(c.note).toContain("fewer than two");
  });
  it("search results: query parameter + search field repeating it", () => {
    document.documentElement.innerHTML =
      '<body><form role="search"><input type="search" name="q" value="Red Shoes"></form></body>';
    expect(classifyPage(document, "/results", "?q=red shoes").pageType).toBe("search-results");
    // same URL but the field does not repeat the query: only one kind of signal
    document.documentElement.innerHTML =
      '<body><form role="search"><input type="search" name="q" value=""></form></body>';
    expect(classifyPage(document, "/results", "?q=red shoes").pageType).toBe("any");
  });
  it("product detail: JSON-LD + URL", () => {
    document.documentElement.innerHTML =
      '<head><script type="application/ld+json">{"@type":"Product","name":"x"}</script></head><body></body>';
    expect(classifyPage(document, "/item/123", "").pageType).toBe("product-detail");
  });
  it("home: root path + structure", () => {
    document.documentElement.innerHTML =
      "<body><main><section>a</section><section>b</section><section>c</section></main></body>";
    expect(classifyPage(document, "/", "").pageType).toBe("home");
    expect(classifyPage(document, "/", "").candidates.home!.length).toBe(2);
    document.documentElement.innerHTML = "<body><main><section>a</section></main></body>";
    expect(classifyPage(document, "/", "").pageType).toBe("any"); // root path alone
  });
  it("refuses to choose when two types are both supported", () => {
    document.documentElement.innerHTML =
      '<head><meta property="og:type" content="article"><script type="application/ld+json">{"@type":"VideoObject"}</script></head><body><video controls></video><article><h1>t</h1><p>' +
      "w ".repeat(120) +
      "</p></article></body>";
    const c = classifyPage(document, "/x", "");
    expect(c.pageType).toBe("any");
    expect(c.note).toContain("ambiguous");
  });
  it("survives invalid JSON-LD", () => {
    document.documentElement.innerHTML =
      '<head><script type="application/ld+json">{not json</script></head><body></body>';
    expect(() => classifyPage(document, "/", "")).not.toThrow();
  });
});

describe("adapter first, generic for the gaps", () => {
  it("uses the adapter confidence where it matches and generic elsewhere", () => {
    document.documentElement.innerHTML = readFileSync("tests/fixtures/google-like.html", "utf8");
    const a = analyzePage(document, findAdapter("www.google.com"), "/search", "?q=x");
    const search = a.recognized.find((r) => r.component === "search-box")!;
    expect(search.source).toBe("adapter");
    expect(a.context.pageType).toBe("search-results"); // adapter hint wins
  });
  it("sites without an adapter now get a real context", () => {
    page("article-generic.html");
    const a = analyzePage(document, null, "/story", "");
    expect(a.context.pageType).toBe("article");
    expect(a.context.components.sidebar).toBe("medium");
    expect(a.resolver("sidebar").length).toBe(1);
    expect(a.recognized.every((r) => r.source === "generic")).toBe(true);
  });
});

describe("fallback when unsure", () => {
  const plan = (profile: "western" | "china", conf: "low" | "medium") =>
    buildPlan({
      ruleSets: [western, china],
      profiles,
      profile,
      depth: "structural",
      context: {
        pageType: "article",
        components: { sidebar: conf },
        viewportWidth: 1280,
        metrics: { mediaPer1000Px: 40 },
      },
    });
  it("a structural rule never runs on a low-confidence component", () => {
    const p = plan("western", "low");
    expect(p.entries.map((e) => e.rule.id)).not.toContain("structure.western.collapse-sidebar");
    // Skipped by the rule's own "medium confidence required" condition or by the low-confidence fallback.
    expect(
      p.skipped.find((s) => s.ruleId === "structure.western.collapse-sidebar")!.reason,
    ).toMatch(/low confidence|below "medium"/);
  });
  it("a visual rule with fallback skip does not run at low confidence, but does at medium", () => {
    const low = buildPlan({
      ruleSets: [western, china],
      profiles,
      profile: "china",
      depth: "visual",
      context: { pageType: "home", components: { recommendations: "low" }, viewportWidth: 1280 },
    });
    expect(low.entries.map((e) => e.rule.id)).not.toContain("visual.china.discovery-feed");
    const med = buildPlan({
      ruleSets: [western, china],
      profiles,
      profile: "china",
      depth: "visual",
      context: { pageType: "home", components: { recommendations: "medium" }, viewportWidth: 1280 },
    });
    expect(med.entries.map((e) => e.rule.id)).toContain("visual.china.discovery-feed");
  });
});
