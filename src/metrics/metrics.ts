import { classifyPage } from "../analyzer/pageType";
import { normalizeHost } from "../shared/settings";
// Page metrics: our own operationalisation of the indicators reported in the research
// (docs/01 section 2). Definitions are ours and may differ from the studies' exact methods;
// each one is written down in METRIC_DEFINITIONS and exported with every measurement.
// Privacy: only numbers, the host, a page-type label and the language are produced.
// No page text, URL path, query or user data is kept.

export const METRICS_SCHEMA = "xsuit.metrics/2";

export const METRIC_DEFINITIONS: Record<string, string> = {
  pageHeightPx: "Full document height in CSS pixels.",
  mediaPer1000Px:
    "Visible images, pictures, videos, canvases and large SVGs per 1,000 px of page height (after li2026 'visual density').",
  imageCount: "Visible <img>/<picture> elements at least 24x24 px.",
  videoCount: "Visible <video> elements.",
  textUnits: "Words in space-separated scripts plus individual CJK characters, in visible text.",
  textUnitsPer1000Px: "textUnits per 1,000 px of page height.",
  headingsPer1000Text: "h1-h6 elements per 1,000 text units (after li2026).",
  paragraphsPer1000Text: "<p> elements per 1,000 text units (after li2026).",
  mainBlocks:
    "APPROXIMATE. Outermost visible section/article/[role=region] blocks (or direct children of <main>) outside header, footer, nav and aside.",
  peripheralBlocks: "APPROXIMATE. Outermost visible <aside> / [role=complementary] blocks.",
  linkCount: "Visible links with an href.",
  interactivePer1000Px:
    "Visible links, buttons, inputs, selects and textareas per 1,000 px (after li2022 'elements and interactions').",
  underlinedLinkRatio:
    "Share of visible text links whose computed text-decoration includes underline (after li2022).",
  footerLinkCount:
    "Links inside <footer> / [role=contentinfo] (after li2022 'articulated footers').",
  autoplayCount:
    "Autoplaying <video>/<audio>, <marquee>, and running infinite CSS animations (after li2026).",
  qrCodeCount:
    "HEURISTIC. Images whose alt, src, class or id mention 'qr', 'qrcode' or the Chinese term for QR code (after li2026).",
  meanSaturation:
    "Area-weighted mean HSL saturation (0-1) of non-transparent backgrounds and text colours of sampled visible elements (after li2026 palette findings).",
  meanLightness: "Area-weighted mean HSL lightness (0-1) of the same sample.",
  distinctHues:
    "Number of 30-degree hue bins used by clearly coloured (saturation > 0.25) sampled colours.",
  whitespaceRatio:
    "APPROXIMATE. 1 minus the share of page area covered by leaf content (elements with their own text, media, form controls). Overlaps are not removed, so the value is clamped at 0.",
};

export interface PageMetrics {
  pageHeightPx: number | null;
  mediaPer1000Px: number | null;
  imageCount: number;
  videoCount: number;
  textUnits: number;
  textUnitsPer1000Px: number | null;
  headingsPer1000Text: number | null;
  paragraphsPer1000Text: number | null;
  mainBlocks: number;
  peripheralBlocks: number;
  linkCount: number;
  interactivePer1000Px: number | null;
  underlinedLinkRatio: number | null;
  footerLinkCount: number;
  autoplayCount: number;
  qrCodeCount: number;
  meanSaturation: number | null;
  meanLightness: number | null;
  distinctHues: number;
  whitespaceRatio: number | null;
}

export interface Measurement {
  schema: typeof METRICS_SCHEMA;
  capturedAt: string;
  page: { host: string; pageType: string; lang: string };
  viewport: { width: number; height: number };
  /** False when the environment has no layout (unit tests): size-based metrics are null. */
  hasLayout: boolean;
  sampledElements: number;
  metrics: PageMetrics;
  definitions: Record<string, string>;
}

const CJK = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/g;
const SAMPLE_LIMIT = 3000;
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

export function countTextUnits(text: string): number {
  const cjk = text.match(CJK)?.length ?? 0;
  const rest = text.replace(CJK, " ").trim();
  const words = rest ? rest.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;
  return cjk + words;
}

export function parseColor(value: string): { r: number; g: number; b: number; a: number } | null {
  const m = value.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  );
  if (!m) return null;
  let a = 1;
  if (m[4] !== undefined) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

const OWN = "[data-xsuit-ui]"; // anything the extension itself adds is never measured

interface Computed {
  metrics: PageMetrics;
  hasLayout: boolean;
  sampled: number;
}

/**
 * The numbers rules compare with thresholds. This is all the release build needs; the exportable
 * measurement file (with host, page type, definitions) is built by measurePage, developer build only.
 */
export function computeMetrics(doc: Document): PageMetrics {
  return compute(doc).metrics;
}

function compute(doc: Document): Computed {
  const win = doc.defaultView!;
  const root = doc.documentElement;
  const body = doc.body ?? root;
  const pageHeight = Math.max(
    root.scrollHeight || 0,
    body.scrollHeight || 0,
    root.getBoundingClientRect().height || 0,
  );
  const pageWidth = Math.max(root.clientWidth || 0, win.innerWidth || 0);
  const hasLayout = pageHeight > 0 && pageWidth > 0;
  const per1000 = (n: number) => (hasLayout ? round(n / (pageHeight / 1000)) : null);

  // Hidden if the element or any ancestor is display:none / visibility:hidden (cached).
  const hiddenCache = new WeakMap<Element, boolean>();
  const hidden = (el: Element): boolean => {
    const known = hiddenCache.get(el);
    if (known !== undefined) return known;
    const cs = win.getComputedStyle(el);
    const result =
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      (el.parentElement !== null && hidden(el.parentElement));
    hiddenCache.set(el, result);
    return result;
  };
  const visible = (el: Element, minSize = 1): boolean => {
    if (el.closest(OWN) || hidden(el)) return false;
    if (!hasLayout) return true;
    const r = el.getBoundingClientRect();
    return r.width >= minSize && r.height >= minSize;
  };
  const all = <T extends Element>(sel: string, minSize = 1) =>
    [...doc.querySelectorAll<T>(sel)].filter((e) => visible(e, minSize));
  const outermost = (els: Element[]) =>
    els.filter((e) => !els.some((o) => o !== e && o.contains(e)));

  const images = all("img, picture", 24).filter(
    (e) => !(e.tagName === "IMG" && e.parentElement?.tagName === "PICTURE"),
  );
  const videos = all("video");
  const otherMedia = all("canvas, svg", 48);
  const mediaCount = images.length + videos.length + otherMedia.length;

  // Text
  let textUnits = 0;
  const walker = doc.createTreeWalker(body, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(parent.tagName)) continue;
    const text = n.textContent ?? "";
    if (!text.trim() || !visible(parent, 0)) continue;
    textUnits += countTextUnits(text);
  }
  const perText = (n: number) => (textUnits > 0 ? round((n / textUnits) * 1000) : null);

  // Blocks
  const inChrome = (e: Element) =>
    e.closest(
      "header, footer, nav, aside, [role=banner], [role=contentinfo], [role=navigation], [role=complementary]",
    ) !== null;
  let main = outermost(all("section, article, [role=region]")).filter((e) => !inChrome(e));
  if (main.length === 0) {
    const m = doc.querySelector("main, [role=main]");
    if (m) main = [...m.children].filter((e) => visible(e));
  }
  const peripheral = outermost(all("aside, [role=complementary]"));

  // Links and interaction
  const links = all<HTMLAnchorElement>("a[href]");
  const interactive = all(
    "a[href], button, input:not([type=hidden]), select, textarea, [role=button]",
  );
  const textLinks = links.filter(
    (a) => (a.textContent ?? "").trim().length > 0 && !a.querySelector("img, picture, svg"),
  );
  const underlined = textLinks.filter((a) => {
    const cs = win.getComputedStyle(a);
    return `${cs.textDecorationLine} ${cs.textDecoration}`.includes("underline");
  });
  const footerLinks = all("footer a[href], [role=contentinfo] a[href]");

  // Autoplay and QR
  let autoplay = all("video[autoplay], audio[autoplay], marquee").length;
  const anims = (doc as Document & { getAnimations?: () => Animation[] }).getAnimations?.() ?? [];
  autoplay += anims.filter((a) => {
    const t = a.effect?.getComputedTiming?.();
    return a.playState === "running" && t?.iterations === Infinity;
  }).length;
  const qr = all<HTMLImageElement>("img").filter((i) =>
    /qr[-_ ]?code|(^|[^a-z])qr([^a-z]|$)|二维码/i.test(
      `${i.alt} ${i.getAttribute("src") ?? ""} ${i.className} ${i.id}`,
    ),
  ).length;

  // Colour and white space (sampled)
  const sample = [...body.querySelectorAll("*")].slice(0, SAMPLE_LIMIT);
  let wSum = 0;
  let sSum = 0;
  let lSum = 0;
  const hues = new Set<number>();
  let leafArea = 0;
  let sampled = 0;
  const addColor = (value: string, weight: number) => {
    const c = parseColor(value);
    if (!c || c.a < 0.5) return;
    const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
    wSum += weight;
    sSum += s * weight;
    lSum += l * weight;
    if (s > 0.25 && l > 0.1 && l < 0.9) hues.add(Math.floor(h / 30));
  };
  for (const el of sample) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|HEAD|META|LINK)$/.test(el.tagName) || !visible(el))
      continue;
    sampled++;
    const cs = win.getComputedStyle(el);
    const rect = hasLayout ? el.getBoundingClientRect() : null;
    const area = rect ? rect.width * rect.height : 1;
    addColor(cs.backgroundColor, area);
    const ownText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim(),
    );
    if (ownText) addColor(cs.color, Math.max(1, area * 0.1)); // text covers a small part of its box
    const isLeaf =
      ownText || /^(IMG|VIDEO|CANVAS|SVG|INPUT|SELECT|TEXTAREA|BUTTON)$/i.test(el.tagName);
    if (rect && isLeaf) leafArea += area;
  }

  const metrics: PageMetrics = {
    pageHeightPx: hasLayout ? Math.round(pageHeight) : null,
    mediaPer1000Px: per1000(mediaCount),
    imageCount: images.length,
    videoCount: videos.length,
    textUnits,
    textUnitsPer1000Px: per1000(textUnits),
    headingsPer1000Text: perText(all("h1, h2, h3, h4, h5, h6", 0).length),
    paragraphsPer1000Text: perText(all("p", 0).length),
    mainBlocks: main.length,
    peripheralBlocks: peripheral.length,
    linkCount: links.length,
    interactivePer1000Px: per1000(interactive.length),
    underlinedLinkRatio: textLinks.length ? round(underlined.length / textLinks.length) : null,
    footerLinkCount: footerLinks.length,
    autoplayCount: autoplay,
    qrCodeCount: qr,
    meanSaturation: wSum > 0 ? round(sSum / wSum) : null,
    meanLightness: wSum > 0 ? round(lSum / wSum) : null,
    distinctHues: hues.size,
    whitespaceRatio: hasLayout ? round(Math.max(0, 1 - leafArea / (pageWidth * pageHeight))) : null,
  };

  return { metrics, hasLayout, sampled };
}

/** The exportable measurement of the page (developer build only). */
export function measurePage(doc: Document, now: Date = new Date()): Measurement {
  const win = doc.defaultView!;
  const root = doc.documentElement;
  const { metrics, hasLayout, sampled } = compute(doc);
  return {
    schema: METRICS_SCHEMA,
    capturedAt: now.toISOString(),
    // Data minimization: the URL path, query and fragment are never kept (they can carry personal
    // data). Only the host and a page-type label, which is what the research needs.
    page: {
      host: normalizeHost(win.location.hostname) ?? "",
      pageType: classifyPage(doc, win.location.pathname, win.location.search).pageType,
      lang: /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(root.lang) ? root.lang.toLowerCase() : "",
    },
    viewport: { width: win.innerWidth, height: win.innerHeight },
    hasLayout,
    sampledElements: sampled,
    metrics,
    definitions: METRIC_DEFINITIONS,
  };
}

/** Keeps only characters that are safe in a file name. */
export function safeFilePart(s: string): string {
  return s
    .replace(/[^a-z0-9.-]/gi, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
}

/** File name for an exported measurement, e.g. "www.example.com__2026-11-09T10-00-00.json". */
export function measurementFileName(m: Measurement): string {
  const stamp = m.capturedAt.replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "");
  return `${safeFilePart(m.page.host) || "page"}__${stamp}.json`;
}
