// Runtime accessibility guard (decisions #33, #34). It compares changed elements before and
// after the rules are applied: text contrast, minimum target size and new horizontal scroll.
// Things that cannot be measured (background image or gradient, no layout) are reported as
// "not verifiable" and the rule is kept, never guessed.

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

export interface Snapshot {
  el: Element;
  contrast: ContrastResult;
  targets: { el: Element; minSide: number }[];
}

export interface Problem {
  kind: "contrast" | "target-size";
  detail: string;
}

export class A11yGuard {
  private win: Window;
  constructor(private doc: Document) {
    this.win = doc.defaultView!;
  }

  get hasLayout(): boolean {
    const r = this.doc.documentElement.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  snapshot(el: Element): Snapshot {
    const targets = [el, ...el.querySelectorAll(INTERACTIVE)]
      .filter((t) => t.matches(INTERACTIVE))
      .map((t) => {
        const r = t.getBoundingClientRect();
        return { el: t, minSide: Math.min(r.width, r.height) };
      });
    return { el, contrast: elementContrast(el), targets };
  }

  /** What got measurably worse since the snapshot, or an empty list (plus how many were unverifiable). */
  compare(before: Snapshot): { problems: Problem[]; unverifiable: number } {
    const problems: Problem[] = [];
    let unverifiable = 0;
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
    if (this.hasLayout) {
      for (const t of before.targets) {
        const r = t.el.getBoundingClientRect();
        const now = Math.min(r.width, r.height);
        if (t.minSide >= MIN_TARGET_PX && now < MIN_TARGET_PX)
          problems.push({
            kind: "target-size",
            detail: `a clickable element shrank from ${Math.round(t.minSide)} px to ${Math.round(now)} px (needs ${MIN_TARGET_PX})`,
          });
      }
    } else unverifiable++;
    return { problems, unverifiable };
  }

  overflowsHorizontally(): boolean {
    const root = this.doc.documentElement;
    return this.hasLayout && root.scrollWidth > root.clientWidth + 1;
  }
}
