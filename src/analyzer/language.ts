// Language, script and direction of a page (B20). Everything here is local and read-only:
// nothing is translated, nothing is sent anywhere, and no text is stored (only counts).
// Used to keep typography safe on CJK and right-to-left pages; never to change page content.

export type Script = "latin" | "cjk" | "arabic" | "hebrew" | "cyrillic" | "other";

export interface LanguageInfo {
  /** Primary language subtag from <html lang> (lowercase, e.g. "zh", "ar"); null when the page does not say. */
  lang: string | null;
  /** Dominant script of the visible text; null when there is too little text to tell. */
  script: Script | null;
  /** Direction the page is laid out in. */
  dir: "ltr" | "rtl";
  /** Han, kana or hangul text is a real part of the page. */
  cjk: boolean;
  /** The page is laid out right-to-left (dir attribute or computed direction). */
  rtl: boolean;
  /** Arabic or Hebrew text is a real part of the page (can differ from `rtl` when the page forgot dir). */
  rtlText: boolean;
}

const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "ps", "sd", "ug", "yi", "dv", "ckb"]);
const CJK_LANGS = new Set(["zh", "ja", "ko"]);

const SAMPLE_LETTERS = 2000; // enough to tell the script; bounded so large pages cost nothing
const MIN_LETTERS = 30; // below this the script is not reported
const MIN_SHARE = 0.2; // a script counts as "part of the page" from this share of the letters

/** Script of a code point, or null for digits, punctuation and spaces. */
export function scriptOf(cp: number): Script | null {
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) || // Han
    (cp >= 0x3400 && cp <= 0x4dbf) || // Han extension A
    (cp >= 0x3040 && cp <= 0x30ff) || // hiragana, katakana
    (cp >= 0xac00 && cp <= 0xd7af) || // hangul syllables
    (cp >= 0x20000 && cp <= 0x2a6df) // Han extension B
  )
    return "cjk";
  if (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  )
    return "arabic";
  if (cp >= 0x0590 && cp <= 0x05ff) return "hebrew";
  if (cp >= 0x0400 && cp <= 0x04ff) return "cyrillic";
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0xc0 && cp <= 0x24f))
    return "latin";
  if (cp > 0x7f && /\p{L}/u.test(String.fromCodePoint(cp))) return "other";
  return null;
}

/** Counts letters per script in a text (pure, for tests and for the page sampler). */
export function countScripts(text: string): { counts: Record<Script, number>; total: number } {
  const counts: Record<Script, number> = {
    latin: 0,
    cjk: 0,
    arabic: 0,
    hebrew: 0,
    cyrillic: 0,
    other: 0,
  };
  let total = 0;
  for (const ch of text) {
    const s = scriptOf(ch.codePointAt(0)!);
    if (!s) continue;
    counts[s]++;
    if (++total >= SAMPLE_LETTERS) break;
  }
  return { counts, total };
}

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA"]);

function sampleText(doc: Document): string {
  const body = doc.body;
  if (!body) return "";
  let out = "";
  const walker = doc.createTreeWalker(body, 0x1 | 0x4, {
    acceptNode: (n) =>
      n.nodeType === 1 && SKIP.has((n as Element).tagName)
        ? 2 // FILTER_REJECT: skip this subtree
        : n.nodeType === 3
          ? 1
          : 3, // elements themselves are not accepted, only walked through
  });
  for (let n = walker.nextNode(); n && out.length < SAMPLE_LETTERS * 4; n = walker.nextNode())
    out += (n.nodeValue ?? "") + " ";
  return out;
}

function directionOf(doc: Document): "ltr" | "rtl" {
  for (const el of [doc.body, doc.documentElement]) {
    const d = el?.getAttribute("dir")?.toLowerCase();
    if (d === "rtl" || d === "ltr") return d;
  }
  try {
    const cs = doc.defaultView?.getComputedStyle(doc.body ?? doc.documentElement);
    if (cs?.direction === "rtl") return "rtl";
  } catch {
    /* no layout engine: the page is treated as left-to-right */
  }
  return "ltr";
}

export function detectLanguage(doc: Document): LanguageInfo {
  const raw = doc.documentElement.getAttribute("lang")?.trim().toLowerCase() ?? "";
  const lang = /^[a-z]{2,3}(?:[-_]|$)/.test(raw) ? raw.slice(0, raw.search(/[-_]|$/)) : null;
  const { counts, total } = countScripts(sampleText(doc));
  const share = (s: Script) => (total ? counts[s] / total : 0);
  let script: Script | null = null;
  if (total >= MIN_LETTERS) {
    script = (Object.keys(counts) as Script[]).reduce((a, b) => (counts[b] > counts[a] ? b : a));
  }
  const cjk =
    (total >= MIN_LETTERS && share("cjk") >= MIN_SHARE) || (!!lang && CJK_LANGS.has(lang));
  const dir = directionOf(doc);
  const rtlText =
    (total >= MIN_LETTERS && share("arabic") + share("hebrew") >= MIN_SHARE) ||
    (!!lang && RTL_LANGS.has(lang));
  return { lang, script, dir, cjk, rtl: dir === "rtl", rtlText };
}
