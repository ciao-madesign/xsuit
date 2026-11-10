import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adapters } from "../src/adapters";
import { analyzePage } from "../src/analyzer";
import { defaultEffects } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { buildPlan } from "../src/engine/plan";
import { checkVerification } from "../src/rules/adapterVerification";
import type { Adapter, Profile, RuleSet } from "../src/rules/types";
import { validateAdapter } from "../src/rules/validate";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];
const pages: { file: string; path: string }[] = load("tests/corpus/manifest.json");

const adapter = (
  status: "draft" | "tested",
  selectors: string[],
  component: Adapter["components"][number]["component"] = "sidebar",
  confidence: "low" | "medium" | "high" = "high",
): Adapter => ({
  id: "site.test",
  site: "Test",
  hosts: ["test.example"],
  status,
  pageTypeHints: [],
  components: [{ component, selectors, confidence }],
});
const open = (html: string) => (document.documentElement.innerHTML = html);
const PAGE = `<head></head><body><header><a href="/">x</a></header>
  <aside id="real">Related <a href="/1">1</a></aside><div id="other">Other</div><footer><a href="/a">a</a><a href="/b">b</a><a href="/c">c</a></footer></body>`;

describe("adapters are optional hints (decision #48)", () => {
  it("a draft adapter that disagrees with the generic analyzer is ignored", () => {
    open(PAGE);
    const a = analyzePage(document, adapter("draft", ["#other"]), "/");
    const sidebar = a.recognized.find((r) => r.component === "sidebar")!;
    expect(sidebar.source).toBe("generic");
    expect(a.resolver("sidebar")[0]!.id).toBe("real");
    expect(a.adapterHits[0]!.result).toBe("conflict");
  });
  it("a draft adapter that agrees confirms, and lifts a weak result to medium", () => {
    open("<head></head><body><div class='carousel'><div>x</div></div></body>");
    const a = analyzePage(document, adapter("draft", [".carousel"], "carousel"), "/");
    const c = a.recognized.find((r) => r.component === "carousel")!;
    expect(c.confidence).toBe("medium");
    expect(c.signals.join(" ")).toContain("adapter (draft) agrees");
    expect(a.adapterHits[0]!.result).toBe("agreed");
  });
  it("a draft adapter alone is low confidence, so no rule acts on it", () => {
    open("<head></head><body><div id='x'>side</div></body>");
    const a = analyzePage(document, adapter("draft", ["#x"]), "/");
    expect(a.context.components.sidebar).toBe("low");
    const plan = buildPlan({
      ruleSets,
      profiles,
      profile: "western",
      depth: "structural",
      context: { ...a.context, pageType: "article", viewportWidth: 1280, metrics: {} },
    });
    expect(
      plan.entries.filter(
        (e) => JSON.stringify(e.rule.components).includes("sidebar") && e.rule.mode !== "visual",
      ),
    ).toEqual([]);
  });
  it("a tested adapter wins where it matches", () => {
    open(PAGE);
    const a = analyzePage(document, adapter("tested", ["#other"]), "/");
    expect(a.resolver("sidebar")[0]!.id).toBe("other");
    expect(a.recognized.find((r) => r.component === "sidebar")!.source).toBe("adapter");
  });
  it("selectors that match nothing are reported, and the generic result stays", () => {
    open(PAGE);
    const a = analyzePage(document, adapter("draft", [".gone-after-redesign"]), "/");
    expect(a.adapterHits[0]!.result).toBe("no-match");
    expect(a.resolver("sidebar")[0]!.id).toBe("real");
  });
  it("a draft page-type hint is used only when the generic classifier cannot decide", () => {
    open(PAGE);
    const ad = {
      ...adapter("draft", ["#real"]),
      pageTypeHints: [{ pageType: "video" as const, urlPattern: "^/x$" }],
    };
    expect(analyzePage(document, ad, "/x").context.pageType).toBe("video");
    open(
      `<head><meta property="og:type" content="article"></head><body><article><h1>t</h1>${"<p>word </p>".repeat(120)}</article></body>`,
    );
    expect(analyzePage(document, ad, "/story").context.pageType).toBe("article");
  });
});

describe("a stale or hostile adapter cannot break a page", () => {
  const hostile = (status: "draft" | "tested"): Adapter => ({
    ...adapter(status, ["*", "body", "div", "html", "[class]"]),
    components: (
      ["header", "primary-nav", "sidebar", "footer", "article-body", "carousel"] as const
    ).map((component) => ({
      component,
      selectors: ["*", "body", "div", "html", "[class]"],
      confidence: "high" as const,
    })),
  });
  for (const status of ["draft", "tested"] as const)
    it(`restores exactly on every corpus page (${status})`, () => {
      for (const p of pages) {
        open(readFileSync(join("tests/corpus", p.file), "utf8"));
        const before = document.documentElement.outerHTML;
        const ad = hostile(status);
        const a = analyzePage(document, ad, "/");
        const engine = new Engine({
          doc: document,
          resolve: (c) => a.resolver(c),
          effects: defaultEffects,
        });
        expect(() =>
          engine.start({
            ruleSets,
            profiles,
            profile: "china",
            depth: "structural",
            context: { ...a.context, viewportWidth: 1280 },
            disabledRules: [],
          }),
        ).not.toThrow();
        engine.restore();
        expect(document.documentElement.outerHTML, p.file).toBe(before);
      }
    });
});

describe("adapter validation (stricter)", () => {
  const ok = () => JSON.parse(JSON.stringify(adapters[0]));
  it("all shipped adapters are valid", () => {
    for (const a of adapters) expect(validateAdapter(a).ok, a.id).toBe(true);
  });
  it("rejects over-broad selectors, too many selectors, long or slow patterns", () => {
    const a = ok();
    a.components[0].selectors = ["div"];
    expect(validateAdapter(a).ok).toBe(false);
    a.components[0].selectors = Array.from({ length: 9 }, (_, i) => `#a${i}`);
    expect(validateAdapter(a).ok).toBe(false);
    const b = ok();
    b.pageTypeHints = [{ pageType: "home", urlPattern: "^(a+)+$" }];
    expect(validateAdapter(b).ok).toBe(false);
    b.pageTypeHints = [{ pageType: "home", urlPattern: "(" }];
    expect(validateAdapter(b).ok).toBe(false);
  });
  it("rejects hosts that are too broad", () => {
    const a = ok();
    a.hosts = ["co.uk"];
    expect(validateAdapter(a).ok).toBe(false);
  });
  it("'tested' needs a verification record; a draft must not have one", () => {
    const a = ok();
    a.status = "tested";
    expect(validateAdapter(a).ok).toBe(false);
    const b = ok();
    b.verification = {
      checkedOn: "2026-11-10",
      browser: "Chrome 1",
      pageTypes: ["home"],
      sheet: "site.x.json",
    };
    expect(validateAdapter(b).ok).toBe(false);
  });
  it("every selector compiles", () => {
    for (const a of adapters)
      for (const c of a.components)
        for (const s of c.selectors)
          expect(() => document.querySelector(s), `${a.id} ${s}`).not.toThrow();
  });
});

describe("the 'tested' gate", () => {
  it("every tested adapter has a passing verification sheet; drafts have none", () => {
    for (const a of adapters) {
      if (a.status === "tested") {
        const file = join("research/adapter-verification", `${a.id}.json`);
        expect(existsSync(file), `${a.id} needs ${file}`).toBe(true);
        expect(checkVerification(a, load(file)), a.id).toEqual([]);
      } else expect(a.verification, a.id).toBeUndefined();
    }
  });
  const base: Adapter = {
    ...adapter("tested", ["#a"], "sidebar", "medium"),
    pageTypeHints: [{ pageType: "home", urlPattern: "^/$" }],
    verification: {
      checkedOn: "2026-11-10",
      browser: "Chrome 130",
      pageTypes: ["home"],
      sheet: "site.test.json",
    },
  };
  const sheet = () => ({
    schema: "xsuit.adapter-verification/1",
    adapter: "site.test",
    checkedOn: "2026-11-10",
    browser: "Chrome 130",
    observer: "someone",
    loggedIn: false,
    pageTypes: ["home"],
    components: [
      { component: "sidebar", selectors: [{ selector: "#a", found: 1, confirmed: true }] },
    ],
    pageTypeHints: [{ pageType: "home", urlPattern: "^/$", samplePath: "/", matches: true }],
  });
  it("accepts a complete sheet", () => expect(checkVerification(base, sheet())).toEqual([]));
  it("rejects missing, unconfirmed, stale or private-looking entries", () => {
    const a = sheet();
    a.components[0]!.selectors[0]!.confirmed = false;
    expect(checkVerification(base, a).join()).toContain("not confirmed");
    const b = sheet();
    b.components = [];
    expect(checkVerification(base, b).join()).toContain("was not checked");
    const c = sheet();
    c.pageTypeHints[0]!.samplePath = "/user/john?token=1";
    expect(checkVerification(base, c).join()).toContain("samplePath");
    const d = sheet();
    d.checkedOn = "2026-01-01";
    expect(checkVerification(base, d).join()).toContain("differs");
    expect(checkVerification(base, { ...sheet(), adapter: "site.other" }).join()).toContain(
      "not site.test",
    );
  });
});
