import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { defaultEffects } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import type { Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rs = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles: Profile[] = load("rules/profiles.json");

function run(profile: "western" | "china") {
  document.documentElement.innerHTML =
    "<head></head><body><div><p>text</p><img src='a.png' alt=''><section>s</section></div></body>";
  const before = document.documentElement.outerHTML;
  const a = analyzePage(document, null, "/", "");
  const engine = new Engine({
    doc: document,
    resolve: a.resolver,
    effects: defaultEffects,
    getContext: () => ({ ...a.context, viewportWidth: 1280, metrics: { mediaPer1000Px: 0 } }),
    a11yGuard: false,
  });
  engine.start({
    ruleSets: rs,
    profiles,
    profile,
    depth: "visual",
    context: { ...a.context, viewportWidth: 1280, metrics: { mediaPer1000Px: 0 } },
  });
  return { engine, before };
}

describe("page-level effects (no recognized blocks needed)", () => {
  it("the two profiles produce different, visible CSS on a page with nothing recognized", () => {
    const w = run("western");
    const wCss = document.getElementById("xsuit-style")!.textContent;
    w.engine.restore();
    const c = run("china");
    const cCss = document.getElementById("xsuit-style")!.textContent;
    c.engine.restore();
    expect(wCss).toContain("saturate(0.6)");
    expect(cCss).toContain("saturate(1.5)");
    expect(wCss).not.toEqual(cCss);
  });
  it("restores exactly", () => {
    const r = run("china");
    r.engine.restore();
    expect(document.documentElement.outerHTML).toBe(r.before);
  });
});
