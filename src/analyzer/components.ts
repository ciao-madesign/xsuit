// Generic component recognition (no site adapter needed).
// Order of trust, as chosen by the user: HTML semantics and ARIA first, then structured data,
// then very few heuristics for simple things (search box, carousel). When unsure, report low
// confidence or nothing: the engine then falls back (usually: skips the rule).
// Everything here is read-only; the page is never changed.

import type { Confidence } from "../engine/types";
import { deepQueryAll, parentDeep, shadowRootsUnder } from "./deep";
import type { Component } from "../rules/types";

export interface Found {
  elements: Element[];
  confidence: Confidence;
  /** Why: each entry is "semantic:...", "structured:...", "content:..." or "heuristic:...". */
  signals: string[];
}
export type Recognition = Partial<Record<Component, Found>>;

const OWN = "[data-xsuit-ui]";
/** The same list as above, as a selector: lets the browser find them without scanning every element. */
const KNOWN_CAROUSEL_SELECTOR = [
  "swiper",
  "swiper-container",
  "slick-slider",
  "carousel",
  "owl-carousel",
  "glide",
  "splide",
]
  .map((c) => `.${c}`)
  .join(",");
const SEARCH_NAMES = /^(q|wd|query|keyword|keywords|search|s|kw|searchtext|search_query)$/i;
const SEARCH_LABEL = /search|搜索|搜尋|buscar|recherche|suche/i;

export function makeHelpers(doc: Document) {
  const win = doc.defaultView!;
  const hiddenCache = new WeakMap<Element, boolean>();
  const hidden = (el: Element): boolean => {
    const known = hiddenCache.get(el);
    if (known !== undefined) return known;
    const cs = win.getComputedStyle(el);
    const r =
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      el.hasAttribute("hidden") ||
      el.getAttribute("aria-hidden") === "true" ||
      (parentDeep(el) !== null && hidden(parentDeep(el)!));
    hiddenCache.set(el, r);
    return r;
  };
  const visible = (el: Element) => !el.closest(OWN) && !hidden(el);
  // Keeps the elements that are not inside another element of the list. Walks each element's
  // ancestors once, so it stays fast on pages with thousands of matches (it used to compare all pairs).
  const outermost = (els: Element[]) => {
    const set = new Set(els);
    return els.filter((e) => {
      for (let p = parentDeep(e); p; p = parentDeep(p)) if (set.has(p)) return false;
      return true;
    });
  };
  const pageLevel = (el: Element) =>
    !el.parentElement?.closest("article, section, main, aside, [role=main], [role=article]");
  const links = (el: Element) => el.querySelectorAll("a[href]").length;
  const roots = shadowRootsUnder(doc); // read once per analysis: web components are searched too
  const all = (sel: string) => deepQueryAll(doc, sel, roots).filter(visible);
  const words = (el: Element) => (el.textContent ?? "").trim().split(/\s+/).filter(Boolean).length;
  return { visible, outermost, pageLevel, links, all, words };
}

const rank = (semantic: number, corroboration: number): Confidence =>
  semantic >= 1 && semantic + corroboration >= 2 ? "high" : semantic >= 1 ? "medium" : "low";

export function recognizeComponents(doc: Document): Recognition {
  const h = makeHelpers(doc);
  const out: Recognition = {};

  // header: page-level <header> or role=banner
  {
    const el = h.outermost(h.all("header, [role=banner]").filter(h.pageLevel))[0];
    if (el) {
      const signals = [el.tagName === "HEADER" ? "semantic:tag header" : "semantic:role banner"];
      if (el.querySelector("nav, [role=navigation], [role=search]"))
        signals.push("content:contains navigation or search");
      out.header = { elements: [el], confidence: rank(1, signals.length - 1), signals };
    }
  }

  // primary navigation: a nav with at least 3 links, preferring one inside the header
  {
    const navs = h.outermost(h.all("nav, [role=navigation]")).filter((n) => h.links(n) >= 3);
    const inHeader = navs.find((n) => n.closest("header, [role=banner]"));
    const el = inHeader ?? navs.sort((a, b) => h.links(b) - h.links(a))[0];
    if (el) {
      const signals = [
        el.tagName === "NAV" ? "semantic:tag nav" : "semantic:role navigation",
        "content:3 or more links",
      ];
      if (inHeader) signals.push("semantic:inside header");
      out["primary-nav"] = { elements: [el], confidence: rank(1, signals.length - 1), signals };
    }
  }

  // search box: semantic signals count most; name/label hints are the only heuristic allowed
  {
    const groups = new Map<Element, { semantic: string[]; hints: string[] }>();
    const slot = (el: Element) => {
      const g = groups.get(el) ?? { semantic: [], hints: [] };
      groups.set(el, g);
      return g;
    };
    for (const el of h.all("[role=search]")) slot(el).semantic.push("semantic:role search");
    for (const input of h.all("input[type=search]"))
      slot(input.closest("form, [role=search]") ?? input).semantic.push(
        "semantic:input type search",
      );
    for (const input of h.all("input:not([type]), input[type=text], input[type=search]")) {
      const i = input as HTMLInputElement;
      const label = `${i.getAttribute("placeholder") ?? ""} ${i.getAttribute("aria-label") ?? ""} ${i.title}`;
      const g = slot(input.closest("form, [role=search]") ?? input);
      if (SEARCH_NAMES.test(i.name)) g.hints.push("heuristic:input name");
      if (SEARCH_LABEL.test(label)) g.hints.push("heuristic:label mentions search");
    }
    const ranked = [...groups.entries()]
      .map(([el, g]) => {
        const semantic = new Set(g.semantic).size;
        const hints = new Set(g.hints).size;
        // Heuristics alone never reach "high": two hints give medium, one gives low.
        const confidence: Confidence =
          semantic >= 2 || (semantic === 1 && hints >= 1)
            ? "high"
            : semantic === 1 || hints >= 2
              ? "medium"
              : hints === 1
                ? "low"
                : "low";
        return {
          el,
          confidence,
          signals: [...new Set([...g.semantic, ...g.hints])],
          score: semantic * 2 + hints,
        };
      })
      .filter((x) => x.signals.length > 0)
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (best)
      out["search-box"] = {
        elements: [best.el],
        confidence: best.confidence,
        signals: best.signals,
      };
  }

  // footer
  {
    const el = h.all("footer, [role=contentinfo]").filter(h.pageLevel).pop();
    if (el) {
      const signals = [
        el.tagName === "FOOTER" ? "semantic:tag footer" : "semantic:role contentinfo",
      ];
      if (h.links(el) >= 3) signals.push("content:3 or more links");
      out.footer = { elements: [el], confidence: rank(1, signals.length - 1), signals };
    }
  }

  // sidebar
  {
    const els = h
      .outermost(h.all("aside, [role=complementary]"))
      .filter((e) => !e.closest("article"));
    if (els.length)
      out.sidebar = {
        elements: els,
        confidence: "medium",
        signals: ["semantic:aside or role complementary"],
      };
  }

  // article body
  {
    const structured = h.all("[itemprop=articleBody]")[0];
    const article = h
      .outermost(h.all("article"))
      .find((a) => h.words(a) >= 100 && a.querySelector("h1, h2"));
    const el = structured ?? article;
    if (el) {
      const signals: string[] = [];
      if (structured) signals.push("structured:itemprop articleBody");
      if (article) signals.push("semantic:article with heading", "content:100 or more words");
      out["article-body"] = { elements: [el], confidence: rank(1, signals.length - 1), signals };
    }
  }

  // video player
  {
    const videos = h.all("video").filter((v) => {
      const r = v.getBoundingClientRect();
      return v.hasAttribute("controls") || r.width >= 200;
    });
    if (videos.length) {
      const v = videos[0]!;
      const signals = ["semantic:tag video"];
      if (v.hasAttribute("controls")) signals.push("semantic:controls attribute");
      out["video-player"] = { elements: [v], confidence: rank(1, signals.length - 1), signals };
    }
  }

  // carousel: ARIA first, a short list of well-known widgets as heuristic
  {
    const aria = h.all("[aria-roledescription=carousel], [aria-roledescription=slider]");
    const byClass = h.all(KNOWN_CAROUSEL_SELECTOR);
    const els = h.outermost([...aria, ...byClass]);
    if (els.length) {
      const el = els[0]!;
      const signals: string[] = [];
      if (aria.includes(el)) signals.push("semantic:aria-roledescription carousel");
      else signals.push("heuristic:known widget class");
      if (
        el.querySelector(
          'button[aria-label*="next" i], button[aria-label*="prev" i], [aria-label*="下一"], [aria-label*="上一"]',
        )
      )
        signals.push("semantic:previous/next controls");
      const semantic = signals.filter((s) => s.startsWith("semantic")).length;
      out.carousel = { elements: els, confidence: semantic ? rank(semantic, 0) : "low", signals };
    }
  }

  // product card: structured data only
  {
    const els = h.outermost(h.all('[itemtype*="schema.org/Product"]'));
    if (els.length)
      out["product-card"] = {
        elements: els,
        confidence: "medium",
        signals: ["structured:microdata Product"],
      };
  }

  return out;
}
