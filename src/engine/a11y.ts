// Runtime accessibility guard (decisions #33, #34). It compares changed elements before and
// after the rules are applied: text contrast, minimum target size and new horizontal scroll.
// Things that cannot be measured (background image or gradient, no layout) are reported as
// "not verifiable" and the rule is kept, never guessed.

import { closestDeep, deepQueryAll, parentDeep } from "../analyzer/deep";
import { parseColor } from "../metrics/metrics";

type RGB = { r: number; g: number; b: number };
type RGBA = RGB & { a: number };

export const MIN_TARGET_PX = 24; // WCAG 2.2 SC 2.5.8 (Target Size, Minimum)
export const MIN_CONTRAST = 4.5; // WCAG SC 1.4.3, normal text
export const MIN_CONTRAST_LARGE = 3; // large text

const clamp = (n: number) => Math.max(0, Math.min(255, n));

/** The CSS saturate() filter matrix, so we can see what a saturation rule does to the colours. */
export function saturate(c: RGB, s: number): RGB {
  const { r, g, b } = c;
  return {
    r: clamp((0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b),
    g: clamp((0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b),
    b: clamp((0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b),
  };
}

export function luminance(c: RGB): number {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Product of every saturate() in a computed filter value; null when the filter has other effects. */
export function saturateFactor(filter: string): number | null {
  if (!filter || filter === "none") return 1;
  let factor = 1;
  let rest = filter;
  for (const m of filter.matchAll(/saturate\(\s*([\d.]+)(%?)\s*\)/g)) {
    factor *= m[2] ? parseFloat(m[1]!) / 100 : parseFloat(m[1]!);
    rest = rest.replace(m[0], "");
  }
  return rest.trim() === "" ? factor : null; // e.g. blur() or opacity(): we cannot account for it
}

const over = (top: RGBA, bottom: RGB): RGB => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
});

export interface ContrastResult {
  ratio: number | null;
  large: boolean;
  /** Why it could not be measured, when ratio is null. */
  unverifiable?: string;
}

/** Contrast of an element's text against its effective background, including saturate filters. */
export function elementContrast(el: Element): ContrastResult {
  const win = el.ownerDocument.defaultView!;
  if (!(el.textContent ?? "").trim()) return { ratio: null, large: false, unverifiable: "no text" };
  const chain: Element[] = [];
  for (let e: Element | null = el; e; e = e.parentElement) chain.push(e);
  // factor[i]: product of saturate filters on chain[i] and everything above it.
  const factor: number[] = new Array(chain.length).fill(1);
  let acc = 1;
  for (let i = chain.length - 1; i >= 0; i--) {
    const f = saturateFactor(win.getComputedStyle(chain[i]!).filter);
    if (f === null) return { ratio: null, large: false, unverifiable: "page uses other filters" };
    acc *= f;
    factor[i] = acc;
  }
  const own = win.getComputedStyle(el);
  const px = parseFloat(own.fontSize) || 16;
  const large = px >= 24 || (px >= 18.66 && parseInt(own.fontWeight, 10) >= 700);
  const text = parseColor(own.color);
  if (!text) return { ratio: null, large, unverifiable: "text colour not readable" };

  const layers: { c: RGBA; f: number }[] = [];
  let opaque = false;
  for (let i = 0; i < chain.length && !opaque; i++) {
    const cs = win.getComputedStyle(chain[i]!);
    if (cs.backgroundImage && cs.backgroundImage !== "none")
      return { ratio: null, large, unverifiable: "background image or gradient" };
    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) {
      layers.push({ c: bg, f: factor[i]! });
      if (bg.a >= 0.99) opaque = true;
    }
  }
  let base: RGB = { r: 255, g: 255, b: 255 }; // browser canvas when nothing opaque was found
  for (const { c, f } of layers.reverse()) base = over({ ...saturate(c, f), a: c.a }, base);
  const fg = over({ ...saturate(text, factor[0]!), a: text.a }, base);
  return { ratio: contrastRatio(fg, base), large };
}

const INTERACTIVE = "a[href], button, input:not([type=hidden]), select, textarea, [role=button]";
const FOCUSABLE = `${INTERACTIVE}, [tabindex]:not([tabindex^="-"])`;
const CIRCLE_RADIUS = MIN_TARGET_PX / 2;
const CELL = 64;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};
const sideOf = (r: Rect) => Math.min(r.right - r.left, r.bottom - r.top);

/** Distance from a point to a rectangle (0 when inside). */
function distanceToRect(x: number, y: number, r: Rect): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

/**
 * WCAG 2.2 SC 2.5.8 "Spacing" exception: an undersized target conforms when a 24 CSS px circle
 * centred on its box intersects no other target and no other undersized target's circle.
 */
export function spacingException(self: Rect, others: Rect[]): boolean {
  const cx = (self.left + self.right) / 2;
  const cy = (self.top + self.bottom) / 2;
  for (const o of others) {
    if (sideOf(o) >= MIN_TARGET_PX) {
      if (distanceToRect(cx, cy, o) < CIRCLE_RADIUS) return false;
    } else {
      const ox = (o.left + o.right) / 2;
      const oy = (o.top + o.bottom) / 2;
      if (Math.hypot(cx - ox, cy - oy) < CIRCLE_RADIUS * 2) return false;
    }
  }
  return true;
}

/** "Inline" exception: a link inside a sentence, sized by the line height of the surrounding text. */
function isInlineInText(el: Element): boolean {
  const win = el.ownerDocument.defaultView!;
  if (win.getComputedStyle(el).display !== "inline") return false;
  const parent = el.parentElement;
  if (!parent) return false;
  let own = 0;
  for (const n of Array.from(parent.childNodes))
    if (n.nodeType === 3) own += (n.textContent ?? "").trim().length;
  return own > 0;
}

/** True when the element renders and can take focus (not display:none / visibility:hidden). */
function isRendered(el: Element): boolean {
  const win = el.ownerDocument.defaultView!;
  for (let e: Element | null = el; e; e = parentDeep(e)) {
    const cs = win.getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
  }
  return true;
}

export interface Snapshot {
  el: Element;
  /** null when contrast is not compared (structural rules). */
  contrast: ContrastResult | null;
  /** Each target with whether it met the minimum size (or an exception) before the change. */
  targets: { el: Element; conformed: boolean }[];
  /** Interactive elements that were reachable before the change. */
  focusables: Element[];
}

export interface Problem {
  kind: "contrast" | "target-size" | "focus";
  detail: string;
}

export class A11yGuard {
  private win: Window;
  private all: { el: Element; rect: Rect }[] | null = null;
  /** Targets bucketed by 64 px cells, so "who is near this one?" does not scan the whole page. */
  private grid: Map<string, number[]> | null = null;
  constructor(private doc: Document) {
    this.win = doc.defaultView!;
  }

  get hasLayout(): boolean {
    const r = this.doc.documentElement.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /** Forget cached positions: call after the page changed (before comparing). */
  refresh(): void {
    this.all = null;
    this.grid = null;
  }

  private page(): { el: Element; rect: Rect }[] {
    if (this.all) return this.all;
    this.all = deepQueryAll(this.doc, INTERACTIVE)
      .filter(isRendered)
      .slice(0, 2000)
      .map((el) => ({ el, rect: rectOf(el) }))
      .filter((t) => t.rect.right > t.rect.left && t.rect.bottom > t.rect.top);
    const grid = new Map<string, number[]>();
    this.all.forEach((t, i) => {
      for (let cx = Math.floor(t.rect.left / CELL); cx <= Math.floor(t.rect.right / CELL); cx++)
        for (let cy = Math.floor(t.rect.top / CELL); cy <= Math.floor(t.rect.bottom / CELL); cy++) {
          const k = `${cx},${cy}`;
          const list = grid.get(k);
          if (list) list.push(i);
          else grid.set(k, [i]);
        }
    });
    this.grid = grid;
    return this.all;
  }

  /** Targets whose box is within reach of a point (cheap: only the nearby cells are looked at). */
  private near(x: number, y: number, reach: number): { el: Element; rect: Rect }[] {
    const all = this.page();
    const seen = new Set<number>();
    for (let cx = Math.floor((x - reach) / CELL); cx <= Math.floor((x + reach) / CELL); cx++)
      for (let cy = Math.floor((y - reach) / CELL); cy <= Math.floor((y + reach) / CELL); cy++)
        for (const i of this.grid?.get(`${cx},${cy}`) ?? []) seen.add(i);
    return [...seen].map((i) => all[i]!).filter((t) => distanceToRect(x, y, t.rect) < reach);
  }

  /** Meets 2.5.8: big enough, or inline in text, or well separated from other targets. */
  private conforms(el: Element): boolean {
    const r = rectOf(el);
    if (sideOf(r) >= MIN_TARGET_PX) return true;
    if (isInlineInText(el)) return true;
    const others = this.near((r.left + r.right) / 2, (r.top + r.bottom) / 2, MIN_TARGET_PX * 2)
      .filter((t) => t.el !== el && !t.el.contains(el) && !el.contains(t.el))
      .map((t) => t.rect);
    return spacingException(r, others);
  }

  snapshot(el: Element, opts: { contrast?: boolean } = {}): Snapshot {
    const inside = [el, ...deepQueryAll(el, FOCUSABLE)].filter((t) => t.matches(FOCUSABLE));
    const layout = this.hasLayout;
    const targets = layout
      ? inside
          .filter((t) => t.matches(INTERACTIVE))
          .map((t) => ({ el: t, conformed: this.conforms(t) }))
      : [];
    return {
      el,
      contrast: opts.contrast === false ? null : elementContrast(el),
      targets,
      focusables: inside.filter(isRendered),
    };
  }

  /** What got measurably worse since the snapshot, or an empty list (plus how many were unverifiable). */
  compare(before: Snapshot): { problems: Problem[]; unverifiable: number } {
    const problems: Problem[] = [];
    let unverifiable = 0;
    if (before.contrast) {
      const after = elementContrast(before.el);
      if (before.contrast.ratio === null || after.ratio === null) {
        if (before.contrast.unverifiable !== "no text" && after.unverifiable !== "no text")
          unverifiable++;
      } else {
        const need = after.large ? MIN_CONTRAST_LARGE : MIN_CONTRAST;
        if (after.ratio < need && after.ratio < before.contrast.ratio - 0.01)
          problems.push({
            kind: "contrast",
            detail: `contrast fell from ${before.contrast.ratio.toFixed(1)} to ${after.ratio.toFixed(1)} (needs ${need})`,
          });
      }
    }
    if (this.hasLayout) {
      for (const t of before.targets) {
        if (!t.conformed || !t.el.isConnected) continue; // already failing before: not our doing
        if (!this.conforms(t.el)) {
          const side = Math.round(sideOf(rectOf(t.el)));
          problems.push({
            kind: "target-size",
            detail: `a clickable element is now ${side} px and no longer meets the 24 px minimum (no spacing or inline exception applies)`,
          });
        }
      }
    } else unverifiable++;
    for (const f of before.focusables) {
      // Hidden on purpose behind a "Show" button (collapse) is fine: the button takes focus.
      if (closestDeep(f, '[data-xsuit-collapsed="1"]')) continue;
      if (!f.isConnected || !isRendered(f)) {
        problems.push({
          kind: "focus",
          detail: "an interactive element can no longer be reached with the keyboard",
        });
        break;
      }
    }
    return { problems, unverifiable };
  }

  overflowsHorizontally(): boolean {
    const root = this.doc.documentElement;
    return this.hasLayout && root.scrollWidth > root.clientWidth + 1;
  }
}
