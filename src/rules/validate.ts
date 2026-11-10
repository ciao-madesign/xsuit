import { normalizeHost } from "../shared/settings";
import { checkConfiguration, type Dimension } from "./configuration";
import type {
  Adapter,
  Profile,
  Rule,
  RuleSet,
  Source,
  ValidationIssue,
  ValidationResult,
} from "./types";
import {
  ACTION_TYPES,
  COMPONENTS,
  CONDITION_TYPES,
  CONFIDENCE,
  EVIDENCE_LEVELS,
  FALLBACKS,
  LEVELS,
  METRIC_NAMES,
  MODES,
  PAGE_TYPES,
  POSITIONS,
  PRIMARY_SOURCE_KINDS,
  PROFILE_IDS,
  PROTECTED_COMPONENTS,
  RISKS,
  SOURCE_KINDS,
  STRENGTHS,
  STRUCTURAL_ACTIONS,
  TEST_OUTCOMES,
  TOKENS,
} from "./vocab";

type Obj = Record<string, unknown>;
const PART_RE = /^[a-z][a-z0-9-]{0,40}$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ID_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
// Anything that could smuggle code or external requests into a selector or pattern.
const MAX_SELECTOR_LENGTH = 200;
const MAX_SELECTORS = 8;
/** A selector that is only a common tag or "*" matches unrelated things on every page. */
const BROAD_SELECTOR_RE = /^(\*|html|body|div|span|a|p|ul|li|section|main|img|form|input)$/i;
/**
 * Adapters locate BLOCKS of a page, never things a user clicks or sends. A selector that aims at
 * links, buttons, inputs, frames or at href/action/onclick/download attributes could be used to
 * steer people toward an action, so it is refused (a search box may use form/input).
 */
const ACTION_TAG_RE =
  /(^|[\s>+~,(])(a|button|input|select|textarea|form|iframe|object|embed|area|label)(?=[\s.#[:>+~,)]|$)/i;
const ACTION_ATTR_RE =
  /\[\s*(href|action|onclick|onsubmit|formaction|download|src|data|srcdoc|target|type|ping)\s*([\]=~|^$*])/i;
const SEARCH_ONLY_TAGS_RE = /(^|[\s>+~,(])(form|input|textarea)(?=[\s.#[:>+~,)]|$)/gi;
const NESTED_QUANTIFIER_RE = /\([^)]*[+*][^)]*\)[+*{]/;
const UNSAFE_RE = /[{};]|url\(|expression\(|javascript:|<|>\s*script/i;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const inList = (list: readonly string[], v: unknown) => typeof v === "string" && list.includes(v);

class Collector {
  errors: ValidationIssue[] = [];
  add(path: string, message: string) {
    this.errors.push({ path, message });
  }
  oneOf(path: string, v: unknown, list: readonly string[]) {
    if (!inList(list, v))
      this.add(path, `must be one of: ${list.join(", ")} (got ${JSON.stringify(v)})`);
  }
  str(path: string, v: unknown) {
    if (!isStr(v)) this.add(path, "must be a non-empty string");
  }
  strArray(
    path: string,
    v: unknown,
    opts: { min?: number; max?: number; item?: (p: string, x: unknown) => void } = {},
  ) {
    if (!Array.isArray(v)) return this.add(path, "must be an array");
    if (opts.min !== undefined && v.length < opts.min)
      this.add(path, `must have at least ${opts.min} item(s)`);
    if (opts.max !== undefined && v.length > opts.max)
      this.add(path, `must have at most ${opts.max} item(s)`);
    v.forEach((x, i) => {
      if (opts.item) opts.item(`${path}[${i}]`, x);
      else this.str(`${path}[${i}]`, x);
    });
  }
  component(path: string, v: unknown) {
    if (inList(PROTECTED_COMPONENTS, v))
      this.add(path, `"${String(v)}" is a protected element and can never be targeted`);
    else this.oneOf(path, v, COMPONENTS);
  }
  result<T>(value: unknown): ValidationResult<T> {
    return this.errors.length
      ? { ok: false, errors: this.errors }
      : { ok: true, value: value as T, errors: [] };
  }
}

function checkAction(c: Collector, a: unknown, mode: unknown) {
  if (!isObj(a)) return c.add("action", "must be an object");
  c.oneOf("action.type", a.type, ACTION_TYPES);
  const t = a.type;
  if (mode === "visual" && inList(STRUCTURAL_ACTIONS, t))
    c.add("action.type", `"${String(t)}" changes structure and is not allowed in mode "visual"`);
  switch (t) {
    case "set-token": {
      const values = isStr(a.token)
        ? (TOKENS as Record<string, readonly string[]>)[a.token]
        : undefined;
      if (!values) c.add("action.token", `must be one of: ${Object.keys(TOKENS).join(", ")}`);
      else c.oneOf("action.value", a.value, values);
      break;
    }
    case "emphasize":
    case "de-emphasize":
      c.component("action.target", a.target);
      if (a.strength !== undefined) c.oneOf("action.strength", a.strength, STRENGTHS);
      break;
    case "collapse":
      c.component("action.target", a.target);
      break;
    case "reorder":
      c.component("action.target", a.target);
      c.oneOf("action.position", a.position, POSITIONS);
      if (a.position === "before" || a.position === "after")
        c.component("action.relativeTo", a.relativeTo);
      break;
    case "group":
      c.strArray("action.targets", a.targets, { min: 2, item: (p, x) => c.component(p, x) });
      break;
    case "surface-shortcut":
      c.component("action.target", a.target);
      c.component("action.to", a.to);
      break;
  }
}

export function validateRule(input: unknown): ValidationResult<Rule> {
  const c = new Collector();
  if (!isObj(input)) {
    c.add("", "rule must be an object");
    return c.result(input);
  }
  const r = input;
  if (!isStr(r.id) || !ID_RE.test(r.id))
    c.add("id", 'must look like "visual.search.compact-density" (lowercase, dot-separated)');
  c.str("title", r.title);
  c.str("description", r.description);
  if (!isStr(r.rationale) || r.rationale.trim().length < 40)
    c.add(
      "rationale",
      "must explain in at least a sentence why this action follows from the evidence",
    );
  c.oneOf("profile", r.profile, PROFILE_IDS);
  if (!isStr(r.dimension) || !PART_RE.test(r.dimension))
    c.add("dimension", "must name a dimension, e.g. density (rules/dimensions.json)");
  if (!isStr(r.pole) || !PART_RE.test(r.pole))
    c.add("pole", "must name a pole of the dimension, e.g. compact");
  if (!isStr(r.version) || !SEMVER_RE.test(r.version)) c.add("version", "must be like 1.0.0");
  if (!isStr(r.introduced) || !DATE_RE.test(r.introduced))
    c.add("introduced", "must be YYYY-MM-DD");
  if (r.lastReviewed !== null && (!isStr(r.lastReviewed) || !DATE_RE.test(r.lastReviewed)))
    c.add("lastReviewed", "must be YYYY-MM-DD, or null when no person has reviewed the rule yet");
  if (!Array.isArray(r.history) || r.history.length === 0)
    c.add("history", "must list at least one entry (version, date, change)");
  else {
    r.history.forEach((h, i) => {
      if (!isObj(h)) return c.add(`history[${i}]`, "must be an object");
      if (!isStr(h.version) || !SEMVER_RE.test(h.version))
        c.add(`history[${i}].version`, "must be like 1.0.0");
      if (!isStr(h.date) || !DATE_RE.test(h.date))
        c.add(`history[${i}].date`, "must be YYYY-MM-DD");
      c.str(`history[${i}].change`, h.change);
    });
    const last = r.history[r.history.length - 1];
    if (isObj(last) && last.version !== r.version)
      c.add("history", "the last entry must be the current version");
  }
  c.oneOf("level", r.level, LEVELS);
  c.oneOf("mode", r.mode, MODES);
  if (r.mode === "deep") c.add("mode", 'mode "deep" is not available in V1');
  c.strArray("pageTypes", r.pageTypes, { min: 1, item: (p, x) => c.oneOf(p, x, PAGE_TYPES) });
  c.strArray("components", r.components, { min: 1, item: (p, x) => c.component(p, x) });

  if (!Array.isArray(r.conditions)) c.add("conditions", "must be an array");
  else
    r.conditions.forEach((cond, i) => {
      const p = `conditions[${i}]`;
      if (!isObj(cond)) return c.add(p, "must be an object");
      c.oneOf(`${p}.type`, cond.type, CONDITION_TYPES);
      if (cond.type === "component-present" || cond.type === "component-absent")
        c.component(`${p}.component`, cond.component);
      if (cond.type === "viewport-min-width" && !(typeof cond.value === "number" && cond.value > 0))
        c.add(`${p}.value`, "must be a positive number");
      if (cond.type === "confidence-min") c.oneOf(`${p}.value`, cond.value, CONFIDENCE);
      if (cond.type === "metric-above" || cond.type === "metric-below") {
        c.oneOf(`${p}.metric`, cond.metric, METRIC_NAMES);
        if (typeof cond.value !== "number" || !Number.isFinite(cond.value))
          c.add(`${p}.value`, "must be a number");
      }
    });

  checkAction(c, r.action, r.mode);
  c.strArray("dependencies", r.dependencies, {
    item: (p, x) => {
      if (!isStr(x) || !ID_RE.test(x)) c.add(p, "must be a valid rule id");
    },
  });
  if (!(
    Number.isInteger(r.priority) &&
    (r.priority as number) >= 0 &&
    (r.priority as number) <= 100
  ))
    c.add("priority", "must be an integer from 0 to 100");
  if (r.reversible !== true) c.add("reversible", "must be true: every V1 rule must be reversible");
  c.oneOf("risk", r.risk, RISKS);
  if (r.risk === "high") c.add("risk", 'risk "high" rules are not allowed in V1');
  c.oneOf("fallback", r.fallback, FALLBACKS);

  if (!isObj(r.evidence)) c.add("evidence", "must be an object (every rule carries evidence)");
  else {
    const e = r.evidence;
    c.oneOf("evidence.level", e.level, EVIDENCE_LEVELS);
    c.str("evidence.summary", e.summary);
    c.strArray("evidence.sources", e.sources, {
      min: 1,
      item: (p, x) => {
        if (!isObj(x)) return c.add(p, "must be an object {id, locator, supports}");
        c.str(`${p}.id`, x.id);
        c.str(`${p}.locator`, x.locator);
        c.str(`${p}.supports`, x.supports);
      },
    });
    const needGaps = e.level === "emerging" || e.level === "hypothesis";
    c.strArray("evidence.gaps", e.gaps, { min: needGaps ? 1 : 0 });
    if (e.level === "hypothesis" && !isStr(e.validationPlan))
      c.add("evidence.validationPlan", "a hypothesis must say how it will be validated");
  }
  c.strArray("limits", r.limits, { min: 1 });
  if (!Array.isArray(r.testResults)) c.add("testResults", "must be an array (may be empty)");
  else
    r.testResults.forEach((t, i) => {
      const p = `testResults[${i}]`;
      if (!isObj(t)) return c.add(p, "must be an object");
      c.str(`${p}.site`, t.site);
      if (!isStr(t.date) || !DATE_RE.test(t.date)) c.add(`${p}.date`, "must be YYYY-MM-DD");
      c.oneOf(`${p}.outcome`, t.outcome, TEST_OUTCOMES);
    });
  return c.result(input);
}

export function validateProfile(
  input: unknown,
  dimensions?: Dimension[],
): ValidationResult<Profile> {
  const c = new Collector();
  if (!isObj(input)) {
    c.add("", "profile must be an object");
    return c.result(input);
  }
  c.oneOf("id", input.id, PROFILE_IDS);
  c.str("name", input.name);
  c.str("description", input.description);
  c.str("version", input.version);
  c.oneOf("reliability", input.reliability, EVIDENCE_LEVELS);
  c.strArray("evidenceRefs", input.evidenceRefs, { min: 1 });
  if (input.composition !== undefined)
    c.add("composition", "replaced by configuration: choose one pole per dimension");
  if (!isObj(input.configuration) || Object.keys(input.configuration).length === 0)
    c.add("configuration", "must choose at least one pole of one dimension");
  else if (dimensions)
    for (const m of checkConfiguration(input.configuration, dimensions)) c.add("configuration", m);
  return c.result(input);
}

/** The dimensions registry: unique ids, known families, at least one pole each. */
export function validateDimensions(input: unknown): ValidationResult<Dimension[]> {
  const c = new Collector();
  if (!Array.isArray(input) || input.length === 0) {
    c.add("", "dimensions must be a non-empty array");
    return c.result(input);
  }
  const seen = new Set<string>();
  input.forEach((d, i) => {
    const p = `[${i}]`;
    if (!isObj(d)) return c.add(p, "must be an object");
    if (!isStr(d.id) || !PART_RE.test(d.id)) c.add(`${p}.id`, "must be a short lowercase id");
    else if (seen.has(d.id)) c.add(`${p}.id`, `duplicate dimension "${d.id}"`);
    else seen.add(d.id);
    c.str(`${p}.name`, d.name);
    c.str(`${p}.description`, d.description);
    c.oneOf(`${p}.family`, d.family, ["visual", "information-architecture"]);
    if (d.measures !== undefined)
      c.strArray(`${p}.measures`, d.measures, { item: (q, x) => c.oneOf(q, x, METRIC_NAMES) });
    if (!Array.isArray(d.poles) || d.poles.length === 0)
      return c.add(`${p}.poles`, "needs at least one pole");
    const poles = new Set<string>();
    d.poles.forEach((x, k) => {
      if (!isObj(x)) return c.add(`${p}.poles[${k}]`, "must be an object");
      if (!isStr(x.id) || !PART_RE.test(x.id))
        c.add(`${p}.poles[${k}].id`, "must be a short lowercase id");
      else if (poles.has(x.id)) c.add(`${p}.poles[${k}].id`, `duplicate pole "${x.id}"`);
      else poles.add(x.id);
      c.str(`${p}.poles[${k}].name`, x.name);
      c.str(`${p}.poles[${k}].description`, x.description);
    });
  });
  return c.result(input);
}

export function validateAdapter(input: unknown): ValidationResult<Adapter> {
  const c = new Collector();
  if (!isObj(input)) {
    c.add("", "adapter must be an object");
    return c.result(input);
  }
  if (!isStr(input.id) || !ID_RE.test(input.id))
    c.add("id", "must be a valid id, e.g. site.google");
  c.str("site", input.site);
  c.strArray("hosts", input.hosts, {
    min: 1,
    item: (p, x) => {
      if (!isStr(x) || !HOST_RE.test(x))
        c.add(p, "must be a bare hostname such as www.example.com");
    },
  });
  c.oneOf("status", input.status, ["draft", "tested"]);
  if (Array.isArray(input.hosts))
    input.hosts.forEach((h, i) => {
      if (isStr(h) && HOST_RE.test(h) && normalizeHost(h) === null)
        c.add(`hosts[${i}]`, "is too broad or not a real site (shared suffix or IP address)");
    });
  if (input.status === "tested") {
    const v = input.verification;
    if (!isObj(v)) c.add("verification", "a tested adapter needs a verification record");
    else {
      if (!isStr(v.checkedOn) || !/^\d{4}-\d{2}-\d{2}$/.test(v.checkedOn))
        c.add("verification.checkedOn", "must be a date YYYY-MM-DD");
      c.str("verification.browser", v.browser);
      c.strArray("verification.pageTypes", v.pageTypes, { min: 1 });
      if (!isStr(v.sheet) || !/^[a-z0-9.-]+\.json$/.test(v.sheet))
        c.add("verification.sheet", "must be a sheet file name in research/adapter-verification/");
    }
  } else if (input.verification !== undefined)
    c.add("verification", "only a tested adapter has a verification record");
  const safe = (p: string, x: unknown) => {
    if (!isStr(x)) c.add(p, "must be a non-empty string");
    else if (UNSAFE_RE.test(x))
      c.add(p, "contains characters that are not allowed in a selector or pattern");
    else if (x.length > MAX_SELECTOR_LENGTH)
      c.add(p, `is longer than ${MAX_SELECTOR_LENGTH} characters`);
  };
  const selector = (p: string, x: unknown, component?: unknown) => {
    safe(p, x);
    if (!isStr(x)) return;
    if (BROAD_SELECTOR_RE.test(x.trim()))
      c.add(p, "is too broad: it would match unrelated parts of any page");
    // The search box is the one component that is a form/input; everything else must not be.
    const isSearch = component === "search-box";
    const probe = isSearch ? x.replace(SEARCH_ONLY_TAGS_RE, "$1") : x;
    const attrProbe = isSearch ? x.replace(/\[\s*(type|action)\s*(?=[\]=~|^$*])/gi, "[x") : x;
    if (ACTION_TAG_RE.test(probe) || ACTION_ATTR_RE.test(attrProbe))
      c.add(
        p,
        "targets something a user clicks or submits (link, button, input, frame, or an href/action attribute): adapters may only locate page blocks",
      );
  };
  const pattern = (p: string, x: unknown) => {
    safe(p, x);
    if (!isStr(x)) return;
    if (NESTED_QUANTIFIER_RE.test(x)) c.add(p, "has nested repetition (slow on some inputs)");
    try {
      new RegExp(x);
    } catch {
      c.add(p, "is not a valid pattern");
    }
  };
  if (!Array.isArray(input.pageTypeHints)) c.add("pageTypeHints", "must be an array");
  else
    input.pageTypeHints.forEach((h, i) => {
      if (!isObj(h)) return c.add(`pageTypeHints[${i}]`, "must be an object");
      c.oneOf(`pageTypeHints[${i}].pageType`, h.pageType, PAGE_TYPES);
      pattern(`pageTypeHints[${i}].urlPattern`, h.urlPattern);
    });
  if (!Array.isArray(input.components)) c.add("components", "must be an array");
  else
    input.components.forEach((m, i) => {
      if (!isObj(m)) return c.add(`components[${i}]`, "must be an object");
      c.component(`components[${i}].component`, m.component);
      c.strArray(`components[${i}].selectors`, m.selectors, {
        min: 1,
        max: MAX_SELECTORS,
        item: (p, x) => selector(p, x, m.component),
      });
      c.oneOf(`components[${i}].confidence`, m.confidence, CONFIDENCE);
    });
  return c.result(input);
}

// Set-level checks: unique ids, profile consistency, dependencies exist, no cycles.
export function validateRuleSet(
  input: unknown,
  registry?: Source[],
  dimensions?: Dimension[],
): ValidationResult<RuleSet> {
  const c = new Collector();
  if (!isObj(input)) {
    c.add("", "rule set must be an object");
    return c.result(input);
  }
  c.oneOf("profile", input.profile, PROFILE_IDS);
  c.str("version", input.version);
  if (!Array.isArray(input.rules)) {
    c.add("rules", "must be an array");
    return c.result(input);
  }
  const ids = new Set<string>();
  const deps = new Map<string, string[]>();
  input.rules.forEach((raw, i) => {
    const res = validateRule(raw);
    for (const e of res.errors) c.add(`rules[${i}].${e.path}`.replace(/\.$/, ""), e.message);
    if (!res.ok || !res.value) return;
    const rule = res.value;
    if (ids.has(rule.id)) c.add(`rules[${i}].id`, `duplicate rule id "${rule.id}"`);
    ids.add(rule.id);
    if (rule.profile !== input.profile)
      c.add(
        `rules[${i}].profile`,
        `rule profile "${rule.profile}" does not match set profile "${String(input.profile)}"`,
      );
    if (dimensions) {
      const d = dimensions.find((x) => x.id === rule.dimension);
      if (!d) c.add(`rules[${i}].dimension`, `unknown dimension "${rule.dimension}"`);
      else if (!d.poles.some((p) => p.id === rule.pole))
        c.add(`rules[${i}].pole`, `dimension "${rule.dimension}" has no pole "${rule.pole}"`);
    }
    deps.set(rule.id, rule.dependencies);
    if (registry) checkEvidenceAgainstRegistry(c, `rules[${i}]`, rule, registry);
  });
  for (const [id, list] of deps)
    for (const d of list)
      if (!ids.has(d)) c.add(`rules.${id}.dependencies`, `unknown dependency "${d}"`);
  const state = new Map<string, number>();
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const d of deps.get(id) ?? []) if (deps.has(d) && visit(d)) return true;
    state.set(id, 2);
    return false;
  };
  for (const id of deps.keys())
    if (visit(id)) {
      c.add(`rules.${id}.dependencies`, "circular dependency");
      break;
    }
  return c.result(input);
}

function checkEvidenceAgainstRegistry(c: Collector, path: string, rule: Rule, registry: Source[]) {
  const byId = new Map(registry.map((x) => [x.id, x]));
  const primary = new Set<string>();
  for (const ref of rule.evidence.sources) {
    const src = byId.get(ref.id);
    if (!src)
      c.add(`${path}.evidence.sources`, `unknown source "${ref.id}" (not in rules/sources.json)`);
    else if ((PRIMARY_SOURCE_KINDS as readonly string[]).includes(src.kind)) primary.add(src.id);
  }
  const lvl = rule.evidence.level;
  if ((lvl === "moderate" || lvl === "strong") && primary.size < 1)
    c.add(
      `${path}.evidence.level`,
      `"${lvl}" needs at least one study or review among its sources`,
    );
  if (lvl === "strong" && primary.size < 2)
    c.add(`${path}.evidence.level`, '"strong" needs at least two independent studies or reviews');
}

export function validateSourceRegistry(input: unknown): ValidationResult<Source[]> {
  const c = new Collector();
  if (!Array.isArray(input)) {
    c.add("", "source registry must be an array");
    return c.result(input);
  }
  const ids = new Set<string>();
  input.forEach((x, i) => {
    const p = `[${i}]`;
    if (!isObj(x)) return c.add(p, "must be an object");
    if (!isStr(x.id) || !/^[a-z0-9-]+$/.test(x.id)) c.add(`${p}.id`, "must be a lowercase slug");
    else if (ids.has(x.id)) c.add(`${p}.id`, `duplicate source id "${x.id}"`);
    else ids.add(x.id);
    c.oneOf(`${p}.kind`, x.kind, SOURCE_KINDS);
    for (const k of ["title", "authors", "url", "sample", "notes"]) c.str(`${p}.${k}`, x[k]);
    if (!Number.isInteger(x.year)) c.add(`${p}.year`, "must be an integer");
    if (typeof x.verified !== "boolean") c.add(`${p}.verified`, "must be true or false");
  });
  return c.result(input);
}

export function formatIssues(errors: ValidationIssue[]): string {
  return errors.map((e) => `- ${e.path || "(root)"}: ${e.message}`).join("\n");
}
