import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { A11yGuard, spacingException } from "../src/engine/a11y";
import { safeDeclaration } from "../src/engine/css";
import { Engine } from "../src/engine/engine";
import { usesForbiddenProperty } from "../src/engine/forbidden";
import type { Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];

type R = { left: number; top: number; width: number; height: number };
function place(el: Element, r: R): void {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      ...r,
      right: r.left + r.width,
      bottom: r.top + r.height,
      x: r.left,
      y: r.top,
      toJSON() {},
    }) as DOMRect;
}
function layout(): void {
  place(document.documentElement, { left: 0, top: 0, width: 1280, height: 800 });
}

describe("WCAG 2.2 target size: exceptions are modelled", () => {
  const box = (l: number, t: number, w: number, h: number) => ({
    left: l,
    top: t,
    right: l + w,
    bottom: t + h,
  });
  it("spacing: an undersized target far from others conforms", () => {
    expect(spacingException(box(100, 100, 16, 16), [box(300, 100, 16, 16)])).toBe(true);
  });
  it("spacing: a neighbouring target too close does not", () => {
    expect(spacingException(box(100, 100, 16, 16), [box(118, 100, 40, 40)])).toBe(false);
    expect(spacingException(box(100, 100, 16, 16), [box(112, 100, 16, 16)])).toBe(false);
  });
  it("two undersized targets conform only when their 24 px circles do not touch", () => {
    expect(spacingException(box(0, 0, 16, 16), [box(24, 0, 16, 16)])).toBe(true);
    expect(spacingException(box(0, 0, 16, 16), [box(20, 0, 16, 16)])).toBe(false);
  });
});

describe("guard: target size and focus", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = `<head></head><body>
      <button id="a">A</button><button id="b">B</button>
      <p>Read the <a id="in" href="/x">terms</a> first.</p></body>`;
    layout();
  });
  afterEach(() => vi.restoreAllMocks());

  it("a button that shrinks but stays well separated is NOT a problem (spacing exception)", () => {
    place(document.getElementById("a")!, { left: 0, top: 0, width: 48, height: 40 });
    place(document.getElementById("b")!, { left: 500, top: 500, width: 48, height: 40 });
    const guard = new A11yGuard(document);
    const snap = guard.snapshot(document.getElementById("a")!, { contrast: false });
    place(document.getElementById("a")!, { left: 0, top: 0, width: 20, height: 20 });
    guard.refresh();
    expect(guard.compare(snap).problems).toEqual([]);
  });
  it("a button that shrinks next to another target IS a problem", () => {
    place(document.getElementById("a")!, { left: 0, top: 0, width: 48, height: 40 });
    place(document.getElementById("b")!, { left: 60, top: 0, width: 48, height: 40 });
    const guard = new A11yGuard(document);
    const snap = guard.snapshot(document.getElementById("a")!, { contrast: false });
    place(document.getElementById("a")!, { left: 40, top: 0, width: 20, height: 20 });
    guard.refresh();
    const res = guard.compare(snap);
    expect(res.problems[0]!.kind).toBe("target-size");
    expect(res.problems[0]!.detail).toContain("no spacing or inline exception");
  });
  it("a target that was already too small before is not blamed on xsuit", () => {
    place(document.getElementById("a")!, { left: 0, top: 0, width: 16, height: 16 });
    place(document.getElementById("b")!, { left: 20, top: 0, width: 16, height: 16 });
    const guard = new A11yGuard(document);
    const snap = guard.snapshot(document.getElementById("a")!, { contrast: false });
    expect(snap.targets[0]!.conformed).toBe(false);
    guard.refresh();
    expect(guard.compare(snap).problems).toEqual([]);
  });
  it("an inline link in a sentence is exempt however small", () => {
    const a = document.getElementById("in")!;
    place(a, { left: 100, top: 200, width: 30, height: 14 });
    const guard = new A11yGuard(document);
    expect(guard.snapshot(a, { contrast: false }).targets[0]!.conformed).toBe(true);
  });
  it("a keyboard-reachable control that disappears is a problem; behind a Show button it is not", () => {
    const guard = new A11yGuard(document);
    const a = document.getElementById("a")!;
    const snap = guard.snapshot(a, { contrast: false });
    a.style.display = "none";
    expect(guard.compare(snap).problems.map((p) => p.kind)).toContain("focus");
    a.style.display = "";
    const wrap = document.createElement("div");
    wrap.setAttribute("data-xsuit-collapsed", "1");
    wrap.style.display = "none";
    a.replaceWith(wrap);
    wrap.append(a);
    expect(guard.compare(snap).problems.map((p) => p.kind)).not.toContain("focus");
  });
});

describe("effects cannot remove focus, add motion or fix widths", () => {
  it("rejects declarations that would", () => {
    for (const bad of [
      "outline: none",
      "outline: 0",
      "outline-style: none",
      "outline-color: transparent",
      "box-shadow: none",
      "animation: spin 1s infinite",
      "transition: all 1s",
      "width: 320px",
      "max-width: 40ch",
      "cursor: none",
      "pointer-events: none",
      "scroll-behavior: smooth",
    ])
      expect(safeDeclaration(bad), bad).toBe(false);
  });
  it("still allows an added outline and full-width media", () => {
    expect(safeDeclaration("outline: 2px solid currentColor")).toBe(true);
    expect(safeDeclaration("width: 100%")).toBe(true);
    expect(usesForbiddenProperty("line-height: 1.5")).toBe(false);
  });
});

describe("reflow: zoom or resize re-checks the page at the new width", () => {
  it("a rule fine at 1280 px but that makes the page scroll sideways at 400 px is undone", () => {
    document.documentElement.innerHTML = `<head></head><body><div data-t="promo-banner" id="p">Sale</div></body>`;
    let width = 1280;
    const root = document.documentElement;
    place(root, { left: 0, top: 0, width: 1280, height: 800 });
    Object.defineProperty(root, "clientWidth", { configurable: true, get: () => width });
    Object.defineProperty(root, "scrollWidth", {
      configurable: true,
      get: () => (root.hasAttribute("data-xsuit") && width < 500 ? 900 : width),
    });
    const engine = new Engine({
      doc: document,
      resolve: () => [...document.querySelectorAll('[data-t="promo-banner"]')],
      effects: { "emphasize=medium": ["gap: 1px"] },
    });
    const input = {
      ruleSets,
      profiles,
      profile: "china" as const,
      depth: "visual" as const,
      context: {
        pageType: "home" as const,
        components: { "promo-banner": "high" as const },
        viewportWidth: width,
        metrics: { mediaPer1000Px: 5 },
      },
      disabledRules: [],
    };
    engine.start(input);
    expect(engine.status.reverted).toEqual([]);
    expect(engine.status.changes.length).toBeGreaterThan(0);

    width = 400; // the user zoomed to 300 %
    engine.reflow();
    expect(engine.status.reverted.length).toBeGreaterThan(0);
    expect(engine.status.reverted[0]!.reason).toContain("scroll sideways");

    width = 1280; // zoomed back: rules come back
    engine.reflow();
    expect(engine.status.reverted).toEqual([]);
    expect(engine.status.changes.length).toBeGreaterThan(0);
    engine.restore();
    expect(root.hasAttribute("data-xsuit")).toBe(false);
  });
});
