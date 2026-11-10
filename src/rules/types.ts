import type {
  ACTION_TYPES,
  COMPONENTS,
  CONDITION_TYPES,
  EVIDENCE_LEVELS,
  FALLBACKS,
  LEVELS,
  MODES,
  PAGE_TYPES,
  PROFILE_IDS,
  RISKS,
  SOURCE_KINDS,
  TEST_OUTCOMES,
} from "./vocab";

type V<T extends readonly string[]> = T[number];

export type ProfileId = V<typeof PROFILE_IDS>;
export type Component = V<typeof COMPONENTS>;
export type PageType = V<typeof PAGE_TYPES>;

export interface Condition {
  type: V<typeof CONDITION_TYPES>;
  component?: Component;
  metric?: string;
  value?: number | string;
}

export interface Action {
  type: V<typeof ACTION_TYPES>;
  target?: Component;
  targets?: Component[];
  token?: string;
  value?: string;
  strength?: string;
  position?: string;
  relativeTo?: Component;
  to?: Component;
  label?: string;
}

export interface SourceRef {
  id: string; // key in rules/sources.json
  locator: string; // where in the source (section, table, figure)
  supports: string; // what exactly this source supports
}

export interface Source {
  id: string;
  kind: V<typeof SOURCE_KINDS>;
  title: string;
  authors: string;
  year: number;
  url: string;
  sample: string;
  verified: boolean; // primary text re-read and figures checked
  notes: string;
}

export interface Evidence {
  level: V<typeof EVIDENCE_LEVELS>;
  summary: string;
  sources: SourceRef[];
  gaps: string[]; // what the evidence does NOT show
  validationPlan?: string; // required for hypotheses
}

export interface TestResult {
  site: string;
  date: string;
  outcome: V<typeof TEST_OUTCOMES>;
  notes?: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  rationale: string; // why this action follows from the evidence
  /** The reference profile this rule was first written for (not a restriction: see dimension/pole). */
  profile: ProfileId;
  /** Dimension of a market configuration this rule acts on (rules/dimensions.json). */
  dimension: string;
  /** Which pole of that dimension the rule implements. */
  pole: string;
  level: V<typeof LEVELS>;
  mode: V<typeof MODES>;
  pageTypes: PageType[];
  components: Component[];
  conditions: Condition[];
  action: Action;
  dependencies: string[];
  priority: number;
  reversible: true;
  risk: V<typeof RISKS>;
  fallback: V<typeof FALLBACKS>;
  evidence: Evidence;
  limits: string[];
  testResults: TestResult[];
  /** Version of this rule (semantic). */
  version: string;
  introduced: string;
  /** Date a person last reviewed the rule against its sources; null = never reviewed. */
  lastReviewed: string | null;
  history: { version: string; date: string; change: string }[];
}

export interface RuleSet {
  profile: ProfileId;
  version: string;
  rules: Rule[];
}

export interface Profile {
  id: ProfileId;
  name: string;
  description: string;
  version: string;
  reliability: V<typeof EVIDENCE_LEVELS>;
  evidenceRefs: string[];
  /** One pole per dimension; a missing dimension keeps the page as it is. Never an automatic average. */
  configuration: Record<string, string>;
}

export interface Adapter {
  id: string;
  site: string;
  hosts: string[];
  status: "draft" | "tested";
  pageTypeHints: { pageType: PageType; urlPattern: string }[];
  components: {
    component: Component;
    selectors: string[];
    confidence: "low" | "medium" | "high";
  }[];
  notes?: string;
  /** Required when status is "tested": proof that a person checked it on the real site. */
  verification?: AdapterVerificationRef;
}

export interface AdapterVerificationRef {
  checkedOn: string;
  browser: string;
  /** Page types that were checked. */
  pageTypes: string[];
  /** Verification sheet, in research/adapter-verification/. */
  sheet: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: ValidationIssue[];
}
