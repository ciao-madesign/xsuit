// Controlled vocabulary for rules, profiles and adapters. Rules are data: they may only use these terms.

export const PROFILE_IDS = ["western", "china", "hybrid"] as const;
export const LEVELS = ["visual", "information-architecture", "interaction", "ecosystem"] as const;
export const MODES = ["visual", "structural", "deep"] as const;
export const RISKS = ["low", "medium", "high"] as const;
export const FALLBACKS = ["skip", "visual-only", "original"] as const;
export const EVIDENCE_LEVELS = ["strong", "moderate", "emerging", "hypothesis"] as const;
export const TEST_OUTCOMES = ["untested", "pass", "partial", "fail"] as const;

export const PAGE_TYPES = [
  "any",
  "home",
  "search-results",
  "product-list",
  "product-detail",
  "article",
  "feed",
  "video",
] as const;

export const COMPONENTS = [
  "page", // the whole page (<body>): for effects the studies measured at page level
  "header",
  "primary-nav",
  "search-box",
  "hero",
  "carousel",
  "promo-banner",
  "product-card",
  "product-grid",
  "filters",
  "recommendations",
  "headline-list",
  "article-body",
  "feed-item",
  "video-player",
  "sidebar",
  "comments",
  "ads",
  "footer",
] as const;

// Never touched by any rule (spec: protected elements).
export const PROTECTED_COMPONENTS = [
  "password-field",
  "payment-form",
  "consent-banner",
  "auth-form",
  "transaction-confirm",
  "account-deletion",
] as const;

export const TOKENS = {
  density: ["compact", "comfortable", "spacious"],
  "spacing-scale": ["tight", "normal", "airy"],
  "palette-saturation": ["muted", "normal", "vivid"],
  "type-scale": ["small", "normal", "large"],
  "image-prominence": ["low", "normal", "high"],
  "visual-hierarchy": ["flat", "balanced", "strong"],
  "link-affordance": ["default", "underlined"],
} as const;

export const ACTION_TYPES = [
  "set-token",
  "emphasize",
  "de-emphasize",
  "collapse",
  "reorder",
  "group",
  "surface-shortcut",
] as const;

export const CONDITION_TYPES = [
  "component-present",
  "component-absent",
  "viewport-min-width",
  "confidence-min",
  "metric-above",
  "metric-below",
] as const;

// Numeric page metrics a rule may test (see src/metrics/metrics.ts for definitions).
export const METRIC_NAMES = [
  "pageHeightPx",
  "mediaPer1000Px",
  "imageCount",
  "videoCount",
  "textUnits",
  "textUnitsPer1000Px",
  "headingsPer1000Text",
  "paragraphsPer1000Text",
  "mainBlocks",
  "peripheralBlocks",
  "linkCount",
  "interactivePer1000Px",
  "underlinedLinkRatio",
  "footerLinkCount",
  "autoplayCount",
  "qrCodeCount",
  "meanSaturation",
  "meanLightness",
  "distinctHues",
  "whitespaceRatio",
] as const;

export const CONFIDENCE = ["low", "medium", "high"] as const;
export const STRENGTHS = ["low", "medium", "high"] as const;
export const POSITIONS = ["first", "last", "before", "after"] as const;

// Actions allowed per mode. Visual mode never changes structure.
export const STRUCTURAL_ACTIONS = ["reorder", "group", "surface-shortcut", "collapse"] as const;

export const SOURCE_KINDS = ["study", "review", "analysis", "synthesis", "standard"] as const;
// Only these kinds can justify a "moderate" or "strong" evidence level.
export const PRIMARY_SOURCE_KINDS = ["study", "review"] as const;
