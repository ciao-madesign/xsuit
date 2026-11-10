// Page-type classifier. A type is accepted only when at least two INDEPENDENT kinds of signal
// agree (structured data, semantic markup, URL, content). One signal, or two types both
// supported, means "any": the engine then does not run page-type-specific rules.

import type { PageType } from "../rules/types";
import { makeHelpers } from "./components";

export type SignalKind = "structured" | "semantic" | "url" | "content";
export interface TypeSignal {
  kind: SignalKind;
  detail: string;
}
export interface Classification {
  pageType: PageType;
  confident: boolean;
  /** Signals found per candidate type, for the explain panel. */
  candidates: Partial<Record<PageType, TypeSignal[]>>;
  note: string;
}

const MAX_JSON_LD = 200_000;
const SEARCH_PARAMS = [
  "q",
  "wd",
  "query",
  "keyword",
  "keywords",
  "search",
  "kw",
  "searchtext",
  "search_query",
];

function jsonLdTypes(doc: Document): string[] {
  const types: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node !== "object" || node === null) return;
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    if (typeof t === "string") types.push(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.push(x));
    if (o["@graph"]) visit(o["@graph"]);
  };
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const text = s.textContent ?? "";
    if (text.length > MAX_JSON_LD) continue;
    try {
      visit(JSON.parse(text));
    } catch {
      /* invalid JSON-LD: ignore it */
    }
  }
  return types;
}

const meta = (doc: Document, prop: string) =>
  doc
    .querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)
    ?.getAttribute("content")
    ?.toLowerCase() ?? "";

export function classifyPage(doc: Document, pathname: string, search: string): Classification {
  const h = makeHelpers(doc);
  const cand: Partial<Record<PageType, TypeSignal[]>> = {};
  const add = (t: PageType, kind: SignalKind, detail: string) =>
    (cand[t] ??= []).push({ kind, detail });
  const path = pathname.toLowerCase();
  const params = new URLSearchParams(search);
  const ld = jsonLdTypes(doc).map((t) => t.toLowerCase());
  const og = meta(doc, "og:type");
  const has = (...names: string[]) => names.some((n) => ld.includes(n));

  // article
  if (has("article", "newsarticle", "blogposting", "reportage"))
    add("article", "structured", "JSON-LD Article");
  if (og === "article") add("article", "structured", "og:type article");
  if (h.all("article").some((a) => h.words(a) >= 100 && a.querySelector("h1, h2")))
    add("article", "semantic", "article element with heading and text");
  if (
    /\/(article|articles|news|post|posts|story|stories|blog)\//.test(path) ||
    /\/20\d\d\/\d{1,2}\//.test(path)
  )
    add("article", "url", "path looks like an article");

  // video
  if (has("videoobject")) add("video", "structured", "JSON-LD VideoObject");
  if (og.startsWith("video")) add("video", "structured", `og:type ${og}`);
  if (
    h.all("video").some((v) => v.hasAttribute("controls") || v.getBoundingClientRect().width >= 200)
  )
    add("video", "semantic", "video element");
  if (/\/(watch|video|videos|v)(\/|$)/.test(path))
    add("video", "url", "path looks like a video page");

  // product detail
  if (has("product")) add("product-detail", "structured", "JSON-LD Product");
  if (og === "product" || og === "og:product")
    add("product-detail", "structured", "og:type product");
  if (/\/(product|products|item|items|dp|p)\//.test(path))
    add("product-detail", "url", "path looks like a product page");
  if (h.all('[itemtype*="schema.org/Product"]').length === 1)
    add("product-detail", "semantic", "single Product microdata block");

  // product list
  if (has("itemlist", "collectionpage"))
    add("product-list", "structured", "JSON-LD ItemList or CollectionPage");
  if (h.all('[itemtype*="schema.org/Product"]').length >= 3)
    add("product-list", "semantic", "several Product microdata blocks");
  if (/\/(category|categories|catalog|list|shop|collection|collections)(\/|$)/.test(path))
    add("product-list", "url", "path looks like a listing");

  // search results
  if (has("searchresultspage")) add("search-results", "structured", "JSON-LD SearchResultsPage");
  const queryKey = SEARCH_PARAMS.find((k) => params.get(k));
  if (queryKey || /\/(search|s)(\/|$)/.test(path))
    add(
      "search-results",
      "url",
      queryKey ? `query parameter "${queryKey}"` : "path looks like search",
    );
  if (queryKey) {
    // The search field holds the same words as the address: compared locally, never stored.
    const q = params.get(queryKey)!.trim().toLowerCase();
    const inputs = h.all(
      "input[type=search], input[type=text], input:not([type]), textarea",
    ) as HTMLInputElement[];
    if (q && inputs.some((i) => i.value.trim().toLowerCase() === q))
      add("search-results", "content", "search field repeats the query");
  }

  // home: root path plus structure typical of a landing page
  if (/^\/([a-z]{2}([-_][a-z]{2,4})?\/?)?$/.test(path) && !queryKey) {
    add("home", "url", "root path");
    if (has("website", "webpage", "organization") || og === "website")
      add("home", "structured", "JSON-LD WebSite or og:type website");
    if (h.all("main > section, main > div > section, body > section").length >= 3)
      add("home", "semantic", "three or more top-level sections");
  }

  // Accept a type only with two independent kinds of signal, and only if it is the single such type.
  const strong = (Object.keys(cand) as PageType[]).filter(
    (t) => new Set(cand[t]!.map((s) => s.kind)).size >= 2,
  );
  if (strong.length === 1) {
    return {
      pageType: strong[0]!,
      confident: true,
      candidates: cand,
      note: `two or more independent signals agree on "${strong[0]}"`,
    };
  }
  return {
    pageType: "any",
    confident: false,
    candidates: cand,
    note:
      strong.length > 1
        ? `ambiguous between ${strong.join(", ")}`
        : "fewer than two independent signals for any type",
  };
}
