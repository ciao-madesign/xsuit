import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { buildCss } from "../src/engine/css";
import { effectFile, INTENSITIES, toCatalog } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { safeDeclaration } from "../src/engine/css";
import { adaptMessage, type AdaptOutcome } from "../src/popup/model";
import { normalizeSettings } from "../src/shared/settings";
import type { Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];

describe("strength levels", () => {
  it("every level of every effect passes the same safety checks", () => {
    for (const e of effectFile.effects)
      for (const level of [e.declarations, ...Object.values(e.levels ?? {})])
        for (const d of level) expect(safeDeclaration(d), `${e.key}: ${d}`).toBe(true);
  });

  it("light, standard and strong move one way: weaker to stronger, never mixed up", () => {
    const num = (d: string) => Number(/-?\d+(\.\d+)?/.exec(d.split(":")[1]!)![0]);
    for (const e of effectFile.effects.filter((x) => x.levels)) {
      e.declarations.forEach((d, i) => {
        const seq = [e.levels!.light[i]!, d, e.levels!.strong[i]!].map(num);
        const up = seq[0]! < seq[1]! && seq[1]! < seq[2]!;
        const down = seq[0]! > seq[1]! && seq[1]! > seq[2]!;
        const flat = seq[0] === seq[1] && seq[1] === seq[2]; // outline-offset
        expect(up || down || flat, `${e.key} ${d}: ${seq}`).toBe(true);
      });
      expect(e.levels!.light.length).toBe(e.declarations.length);
      expect(e.levels!.strong.length).toBe(e.declarations.length);
    }
  });

  it("standard is exactly the catalog used until now (nothing changes for existing users)", () => {
    const std = toCatalog(effectFile, "standard");
    for (const e of effectFile.effects) expect(std[e.key]).toEqual(e.declarations);
    expect(normalizeSettings({}).intensity).toBe("standard");
    expect(normalizeSettings({ intensity: "extreme" }).intensity).toBe("standard");
    expect(normalizeSettings({ intensity: "strong" }).intensity).toBe("strong");
  });

  it("the page gets the chosen strength, and changes it when the setting changes", () => {
    document.documentElement.innerHTML = readFileSync("tests/fixtures/dense.html", "utf8");
    const a = analyzePage(document, null, "/");
    let level: (typeof INTENSITIES)[number] = "light";
    const engine = new Engine({
      doc: document,
      resolve: (c) => a.resolver(c),
      a11yGuard: false,
      effects: () => toCatalog(effectFile, level),
    });
    const ctx = { ...a.context, pageType: "home" as const, viewportWidth: 1280 };
    const start = () =>
      engine.start({ ruleSets, profiles, profile: "china", depth: "visual", context: ctx });
    start();
    const css = () => document.getElementById("xsuit-style")?.textContent ?? "";
    expect(css()).toContain("saturate(1.12)");
    engine.restore();
    level = "strong";
    start();
    expect(css()).toContain("saturate(1.4)");
    engine.restore();
    // and buildCss itself keeps using whatever catalog it is given
    expect(buildCss({ entries: [], skipped: [] }, toCatalog(effectFile, "strong"))).toBe("");
  });
});

const outcome = (o: Partial<AdaptOutcome> = {}): AdaptOutcome => ({
  applied: false,
  rules: 0,
  skipped: [],
  recognized: [{ component: "header" }],
  reverted: [],
  intensity: "standard",
  market: "China",
  ...o,
});

describe("when little or nothing changes, the popup says why", () => {
  it("each reason has its own plain sentence", () => {
    expect(adaptMessage(outcome({ reverted: [{ ruleId: "x", reason: "contrast" }] }))).toMatch(
      /harder to read/,
    );
    expect(
      adaptMessage(
        outcome({
          skipped: [{ ruleId: "a", reason: "this page asks for a password or payment details: x" }],
        }),
      ),
    ).toMatch(/password or payment/);
    expect(
      adaptMessage(
        outcome({ skipped: [{ ruleId: "a", reason: "phone-sized viewport (under 600px): ..." }] }),
      ),
    ).toMatch(/phone-sized/);
    expect(
      adaptMessage(
        outcome({
          skipped: [
            { ruleId: "a", reason: "page already at or below the target (x 3 is not above 5)" },
          ],
        }),
      ),
    ).toBe("This page is already close to the China style.");
    expect(adaptMessage(outcome({ recognized: [] }))).toMatch(/could not recognise/);
    expect(adaptMessage(outcome())).toMatch(/Nothing needed changing/);
  });

  it("a small change suggests a stronger setting; a big one or an already strong one does not", () => {
    expect(adaptMessage(outcome({ applied: true, rules: 2 }))).toMatch(/Strength to Strong/);
    expect(adaptMessage(outcome({ applied: true, rules: 1 }))).toMatch(/1 change\./);
    expect(adaptMessage(outcome({ applied: true, rules: 6 }))).not.toMatch(/Strong/);
    expect(adaptMessage(outcome({ applied: true, rules: 2, intensity: "strong" }))).not.toMatch(
      /Strong/,
    );
  });
});
