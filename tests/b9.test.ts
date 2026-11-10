import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine/engine";
import type { PlanInput } from "../src/engine/plan";
import type { PageContext, Resolver } from "../src/engine/types";
import type { Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const western: RuleSet = load("rules/western.json");
const china: RuleSet = load("rules/china.json");
const profiles: Profile[] = load("rules/profiles.json");

const NAV = `<header id="h"><a href="/a">News</a><a href="/b">Video</a><a href="/c">Shop</a><a href="/d">Games</a><a href="javascript:x()">Bad</a></header>`;
const BODY = `<main><section id="hero">hero</section><aside id="side">side <a href="/x">x</a></aside></main>`;

function run(
  profile: PlanInput["profile"],
  pageType: string,
  components: PageContext["components"],
  body: string,
) {
  document.documentElement.innerHTML = `<head></head><body>${body}</body>`;
  const before = document.documentElement.outerHTML;
  const sel: Record<string, string> = { "primary-nav": "#h", hero: "#hero", sidebar: "#side" };
  const resolve: Resolver = (c) => [...document.querySelectorAll(sel[c] ?? "#none")];
  const context: PageContext = {
    pageType,
    components,
    viewportWidth: 1280,
    metrics: {},
  } as PageContext;
  const engine = new Engine({ doc: document, resolve, a11yGuard: false });
  engine.start({
    ruleSets: [western, china],
    profiles,
    profile,
    depth: "structural",
    context,
  });
  return { engine, before };
}

describe("B9 structural actions", () => {
  it("collapses a sidebar behind a toggle, toggles, and restores exactly", () => {
    const { engine, before } = run("western", "article", { sidebar: "high" }, BODY);
    const side = document.getElementById("side")!;
    expect(side.getAttribute("data-xsuit-collapsed")).toBe("1");
    const btn = document.querySelector<HTMLButtonElement>("[data-xsuit-toggle]")!;
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    btn.click();
    expect(side.getAttribute("data-xsuit-collapsed")).toBe("0");
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("adds a shortcut strip of safe existing links above the hero, and restores exactly", () => {
    const { engine, before } = run(
      "china",
      "home",
      { "primary-nav": "high", hero: "high" },
      NAV + BODY,
    );
    const strip = document.querySelector("[data-xsuit-shortcuts]")!;
    expect([...strip.querySelectorAll("a")].map((a) => a.textContent)).toEqual([
      "News",
      "Video",
      "Shop",
      "Games",
    ]);
    expect(strip.nextElementSibling?.id).toBe("hero");
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("adds no strip when fewer than 3 usable links exist", () => {
    const { engine } = run(
      "china",
      "home",
      { "primary-nav": "high", hero: "high" },
      `<header id="h"><a href="/a">A</a></header><section id="hero"></section>`,
    );
    expect(document.querySelector("[data-xsuit-shortcuts]")).toBeNull();
    engine.restore();
  });

  it("reorder and group stay unsupported and are reported", () => {
    const { engine } = run("china", "home", { recommendations: "high", hero: "high" }, BODY);
    expect(engine.status.report!.unsupported.map((u) => u.ruleId)).toContain(
      "structure.china.recommendations-up",
    );
    engine.restore();
  });
});
