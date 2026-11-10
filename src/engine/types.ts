import type { LanguageInfo } from "../analyzer/language";
import type { Component, PageType, Rule } from "../rules/types";

export type Confidence = "low" | "medium" | "high";

/** What the engine knows about the current page. Filled by the analyzer (B5) or an adapter (B4). */
export interface PageContext {
  pageType: PageType;
  /** Recognized components and how sure we are. Missing key = not found. */
  components: Partial<Record<Component, Confidence>>;
  viewportWidth: number;
  /** Language, script and direction of the page (B20). Used only to keep typography and layout safe. */
  language?: LanguageInfo;
  /** The page asks for a password or payment details: only spacing and typography may change. */
  sensitive?: boolean;
  /** Metrics of the ORIGINAL page, measured once (null = could not be measured). */
  metrics?: Partial<Record<string, number | null>>;
}

export interface PlanEntry {
  rule: Rule;
}

export interface SkippedRule {
  ruleId: string;
  reason: string;
}

export interface Plan {
  entries: PlanEntry[];
  skipped: SkippedRule[];
}

/**
 * Visual effects per token value or emphasis level, as CSS declarations.
 * Keys: "density=compact", "emphasize=high", "de-emphasize=medium".
 * Left empty in B3 on purpose: every real value must be justified by evidence (B4).
 */
export type EffectCatalog = Record<string, string[]>;

export type Resolver = (component: Component) => Element[];

export interface ApplyReport {
  applied: { ruleId: string; elements: number }[];
  unsupported: SkippedRule[];
  protectedSkipped: number;
  guard: {
    checked: number;
    /** Elements that could not be measured (background image, no layout...): kept, but not verified. */
    unverifiable: number;
    reverted: SkippedRule[];
  };
  /** Typography adjustments made because of the page's script (e.g. line height for CJK text). */
  typography: string[];
}
