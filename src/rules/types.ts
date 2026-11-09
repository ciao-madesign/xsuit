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
  profile: ProfileId;
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
  // Hybrid only: explicit composition, never an automatic average.
  composition?: { profile: ProfileId; ruleIds: string[] }[];
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
