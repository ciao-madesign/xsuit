import type { Adapter, Profile, Rule, RuleSet, ValidationIssue, ValidationResult } from "./types";
import {
  ACTION_TYPES,
  COMPONENTS,
  CONDITION_TYPES,
  CONFIDENCE,
  EVIDENCE_LEVELS,
  FALLBACKS,
  LEVELS,
  MODES,
  PAGE_TYPES,
  POSITIONS,
  PROFILE_IDS,
  PROTECTED_COMPONENTS,
  RISKS,
  STRENGTHS,
  STRUCTURAL_ACTIONS,
  TEST_OUTCOMES,
  TOKENS,
} from "./vocab";

type Obj = Record<string, unknown>;
const ID_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
// Anything that could smuggle code or external requests into a selector or pattern.
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
    opts: { min?: number; item?: (p: string, x: unknown) => void } = {},
  ) {
    if (!Array.isArray(v)) return this.add(path, "must be an array");
    if (opts.min !== undefined && v.length < opts.min)
      this.add(path, `must have at least ${opts.min} item(s)`);
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
  c.oneOf("profile", r.profile, PROFILE_IDS);
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
    c.oneOf("evidence.level", r.evidence.level, EVIDENCE_LEVELS);
    c.str("evidence.summary", r.evidence.summary);
    c.strArray("evidence.sources", r.evidence.sources, { min: 1 });
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

export function validateProfile(input: unknown): ValidationResult<Profile> {
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
  if (input.id === "hybrid") {
    if (!Array.isArray(input.composition) || input.composition.length === 0)
      c.add("composition", "hybrid must explicitly list which rules it takes from which profile");
    else
      input.composition.forEach((x, i) => {
        if (!isObj(x)) return c.add(`composition[${i}]`, "must be an object");
        c.oneOf(`composition[${i}].profile`, x.profile, ["western", "china"]);
        c.strArray(`composition[${i}].ruleIds`, x.ruleIds, { min: 1 });
      });
  } else if (input.composition !== undefined)
    c.add("composition", "only the hybrid profile has a composition");
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
  const safe = (p: string, x: unknown) => {
    if (!isStr(x)) c.add(p, "must be a non-empty string");
    else if (UNSAFE_RE.test(x))
      c.add(p, "contains characters that are not allowed in a selector or pattern");
  };
  if (!Array.isArray(input.pageTypeHints)) c.add("pageTypeHints", "must be an array");
  else
    input.pageTypeHints.forEach((h, i) => {
      if (!isObj(h)) return c.add(`pageTypeHints[${i}]`, "must be an object");
      c.oneOf(`pageTypeHints[${i}].pageType`, h.pageType, PAGE_TYPES);
      safe(`pageTypeHints[${i}].urlPattern`, h.urlPattern);
    });
  if (!Array.isArray(input.components)) c.add("components", "must be an array");
  else
    input.components.forEach((m, i) => {
      if (!isObj(m)) return c.add(`components[${i}]`, "must be an object");
      c.component(`components[${i}].component`, m.component);
      c.strArray(`components[${i}].selectors`, m.selectors, { min: 1, item: safe });
      c.oneOf(`components[${i}].confidence`, m.confidence, CONFIDENCE);
    });
  return c.result(input);
}

// Set-level checks: unique ids, profile consistency, dependencies exist, no cycles.
export function validateRuleSet(input: unknown): ValidationResult<RuleSet> {
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
    deps.set(rule.id, rule.dependencies);
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

export function formatIssues(errors: ValidationIssue[]): string {
  return errors.map((e) => `- ${e.path || "(root)"}: ${e.message}`).join("\n");
}
