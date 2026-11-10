import type { Adapter, Component } from "../rules/types";
import type { Confidence, PageContext, Resolver } from "../engine/types";
import { createResolver } from "../adapters";
import { recognizeComponents, type Recognition } from "./components";
import { classifyPage, type Classification } from "./pageType";

export interface RecognizedComponent {
  component: Component;
  confidence: Confidence;
  source: "adapter" | "generic";
  signals: string[];
  elements: number;
}

/** What happened to each adapter component on this page (makes selector drift visible). */
export interface AdapterHit {
  component: Component;
  /** agreed = same block as the generic analyzer; conflict = different block, generic kept. */
  result: "tested-used" | "agreed" | "conflict" | "filled-gap" | "no-match";
  selectors: number;
}

export interface Analysis {
  context: Pick<PageContext, "pageType" | "components">;
  recognized: RecognizedComponent[];
  adapterHits: AdapterHit[];
  classification: Classification;
  resolver: Resolver;
}

const overlaps = (a: Element[], b: Element[]) =>
  a.some((x) => b.some((y) => x === y || x.contains(y) || y.contains(x)));

/**
 * An adapter is a HINT, never a requirement (decision #48, validated 2026-11-10).
 * - A TESTED adapter (verified on the real site) wins where its selectors match.
 * - A DRAFT adapter never overrides the generic analyzer: it can confirm a generic result
 *   (a weak one is then raised to medium), or fill a gap, but only with LOW confidence, so
 *   rules do not act on it. When it disagrees with the generic analyzer, the generic one is kept.
 */
export function analyzePage(
  doc: Document,
  adapter: Adapter | null,
  pathname: string,
  search = "",
): Analysis {
  const generic: Recognition = recognizeComponents(doc);
  const fromAdapter = createResolver(adapter, doc);
  const classification = classifyPage(doc, pathname, search);

  // A TESTED adapter's page-type hint wins over the generic classifier; a draft hint is only
  // used when the generic classifier could not decide ("any").
  let pageType = classification.pageType;
  const hintsCount = adapter && (adapter.status === "tested" || pageType === "any");
  for (const hint of hintsCount ? adapter.pageTypeHints : []) {
    try {
      if (new RegExp(hint.urlPattern).test(pathname)) {
        pageType = hint.pageType;
        break;
      }
    } catch {
      /* invalid pattern: ignore */
    }
  }

  const components: PageContext["components"] = {};
  const recognized: RecognizedComponent[] = [];
  const adapterHits: AdapterHit[] = [];
  const chosen = new Map<Component, Element[]>();
  const tested = adapter?.status === "tested";
  const names = new Set<Component>([
    ...(adapter?.components.map((c) => c.component) ?? []),
    ...(Object.keys(generic) as Component[]),
  ]);
  const useGeneric = (c: Component, extra: string[] = [], lift = false) => {
    const g = generic[c]!;
    const confidence: Confidence = lift && g.confidence === "low" ? "medium" : g.confidence;
    components[c] = confidence;
    chosen.set(c, g.elements);
    recognized.push({
      component: c,
      confidence,
      source: "generic",
      signals: [...g.signals, ...extra],
      elements: g.elements.length,
    });
  };
  for (const c of names) {
    const entry = adapter?.components.find((x) => x.component === c);
    const adapterEls = entry ? fromAdapter(c) : [];
    const g = generic[c];
    const hit = (result: AdapterHit["result"]) =>
      entry && adapterHits.push({ component: c, result, selectors: entry.selectors.length });
    if (entry && adapterEls.length && tested) {
      hit("tested-used");
      components[c] = entry.confidence;
      chosen.set(c, adapterEls);
      recognized.push({
        component: c,
        confidence: entry.confidence,
        source: "adapter",
        signals: ["tested adapter selector matched"],
        elements: adapterEls.length,
      });
    } else if (entry && adapterEls.length && g && overlaps(adapterEls, g.elements)) {
      hit("agreed");
      useGeneric(c, ["adapter (draft) agrees"], true);
    } else if (g) {
      if (entry && adapterEls.length) hit("conflict");
      else if (entry) hit("no-match");
      useGeneric(c);
    } else if (entry && adapterEls.length) {
      // A draft adapter alone is never trusted enough to drive a rule.
      hit("filled-gap");
      components[c] = "low";
      chosen.set(c, adapterEls);
      recognized.push({
        component: c,
        confidence: "low",
        source: "adapter",
        signals: ["draft adapter selector matched (not verified on the real site)"],
        elements: adapterEls.length,
      });
    } else if (entry) hit("no-match");
  }
  return {
    context: { pageType, components },
    recognized,
    adapterHits,
    classification,
    resolver: (component) => chosen.get(component) ?? [],
  };
}
