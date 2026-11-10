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

export interface Analysis {
  context: Pick<PageContext, "pageType" | "components">;
  recognized: RecognizedComponent[];
  classification: Classification;
  resolver: Resolver;
}

/**
 * Adapter first, generic analysis for the gaps (user-validated choice). The adapter's own
 * confidence is used where it finds a component; otherwise the generic recognizer's.
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

  // An adapter page-type hint is a curated signal and wins over the generic classifier.
  let pageType = classification.pageType;
  for (const hint of adapter?.pageTypeHints ?? []) {
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
  const chosen = new Map<Component, Element[]>();
  const names = new Set<Component>([
    ...(adapter?.components.map((c) => c.component) ?? []),
    ...(Object.keys(generic) as Component[]),
  ]);
  for (const c of names) {
    const entry = adapter?.components.find((x) => x.component === c);
    const adapterEls = entry ? fromAdapter(c) : [];
    if (entry && adapterEls.length) {
      components[c] = entry.confidence;
      chosen.set(c, adapterEls);
      recognized.push({
        component: c,
        confidence: entry.confidence,
        source: "adapter",
        signals: ["adapter selector matched"],
        elements: adapterEls.length,
      });
    } else if (generic[c]) {
      const g = generic[c]!;
      components[c] = g.confidence;
      chosen.set(c, g.elements);
      recognized.push({
        component: c,
        confidence: g.confidence,
        source: "generic",
        signals: g.signals,
        elements: g.elements.length,
      });
    }
  }
  return {
    context: { pageType, components },
    recognized,
    classification,
    resolver: (component) => chosen.get(component) ?? [],
  };
}
