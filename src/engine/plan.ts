import { rulesForConfiguration } from "../rules/configuration";
import type { Profile, Rule, RuleSet } from "../rules/types";
import type { Confidence, PageContext, Plan, SkippedRule } from "./types";
import type { Depth, ProfileChoice } from "../shared/settings";

const RANK: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };

/**
 * Below this width the page is a phone layout. xsuit's measurements and thresholds are defined on
 * desktop-width pages (the observation guide asks for 1280 px), so a phone layout differs for
 * device reasons, not market ones, and measured rules do not run there (B20, decision #55).
 */
export const PHONE_MAX_WIDTH = 600;

export interface PlanInput {
  ruleSets: RuleSet[];
  profiles: Profile[];
  profile: ProfileChoice;
  depth: Depth;
  context: PageContext;
  /** Hybrid only: the user's choice of one pole per dimension. Missing = the profile's own configuration. */
  hybridChoices?: Record<string, string> | null;
  /** Hybrid only, legacy: rules picked one by one (before dimensions). Used when no choices exist. */
  hybridRuleIds?: string[] | null;
  /** Rules the user turned off. */
  disabledRules?: string[];
  /** Rules undone on this page by the accessibility guard, with the reason. */
  blockedRules?: Record<string, string>;
}

/**
 * Rules a profile selects: those of its configuration (one pole per dimension). Hybrid is the same
 * thing with the user's own choices, never an automatic mix.
 */
export function selectCandidates(
  input: Pick<PlanInput, "ruleSets" | "profiles" | "profile" | "hybridRuleIds" | "hybridChoices">,
): Rule[] {
  const all = input.ruleSets.flatMap((s) => s.rules);
  if (input.profile === "original") return [];
  const profile = input.profiles.find((p) => p.id === input.profile);
  if (input.profile === "hybrid") {
    if (input.hybridChoices) return rulesForConfiguration(input.hybridChoices, all);
    if (input.hybridRuleIds) {
      const wanted = new Set(input.hybridRuleIds);
      return all.filter((r) => wanted.has(r.id));
    }
  }
  return profile ? rulesForConfiguration(profile.configuration, all) : [];
}

/** True if any rule of this profile depends on a measured metric, so measuring is worth its cost. */
export function needsMetrics(
  input: Pick<PlanInput, "ruleSets" | "profiles" | "profile" | "hybridRuleIds" | "hybridChoices">,
): boolean {
  return selectCandidates(input).some((r) =>
    r.conditions.some((c) => c.type === "metric-above" || c.type === "metric-below"),
  );
}

function confidenceOf(rule: Rule, ctx: PageContext): number {
  // Lowest confidence among the rule's components; unrecognized counts as 0.
  return Math.min(
    ...rule.components.map((c) => (ctx.components[c] ? RANK[ctx.components[c]!] : 0)),
  );
}

/** Why a rule cannot apply here, or null if it can. */
function blocker(rule: Rule, input: PlanInput): string | null {
  const { depth, context: ctx } = input;
  if (rule.mode === "structural" && depth === "visual") return 'needs depth "structural"';
  if (!rule.pageTypes.includes("any") && !rule.pageTypes.includes(ctx.pageType))
    return `does not apply to page type "${ctx.pageType}"`;
  for (const c of rule.conditions) {
    if (c.type === "component-present" && !ctx.components[c.component!])
      return `component "${c.component}" not found`;
    if (c.type === "component-absent" && ctx.components[c.component!])
      return `component "${c.component}" is present`;
    if (c.type === "viewport-min-width" && ctx.viewportWidth < Number(c.value))
      return `viewport narrower than ${c.value}px`;
    if (c.type === "metric-above" || c.type === "metric-below") {
      if (ctx.viewportWidth < PHONE_MAX_WIDTH)
        return `phone-sized viewport (under ${PHONE_MAX_WIDTH}px): the thresholds are defined on desktop-width pages, so the differences here come from the device, not the market`;
      const v = ctx.metrics?.[c.metric!];
      if (typeof v !== "number") return `metric "${c.metric}" not measured`;
      const limit = Number(c.value);
      if (c.type === "metric-above" && !(v > limit))
        return `page already at or below the target (${c.metric} ${v} is not above ${limit})`;
      if (c.type === "metric-below" && !(v < limit))
        return `page already at or above the target (${c.metric} ${v} is not below ${limit})`;
    }
    if (c.type === "confidence-min" && confidenceOf(rule, ctx) < RANK[c.value as Confidence])
      return `component recognition below "${c.value}" confidence`;
  }
  // Pages that ask for credentials or payment: no structural change, no emphasis (anti-abuse).
  if (ctx.sensitive && rule.action.type !== "set-token")
    return "this page asks for a password or payment details: xsuit only changes spacing and typography here";
  // Actions on specific components need recognition. Unsure (low) means the rule's fallback decides:
  // only a visual rule that explicitly allows "visual-only" still applies; everything else skips.
  // Structural rules never run on components we are not sure about.
  if (rule.action.type !== "set-token") {
    const conf = confidenceOf(rule, ctx);
    if (conf === 0) return "target component not recognized";
    if (conf === RANK.low) {
      const keepsVisual = rule.mode === "visual" && rule.fallback === "visual-only";
      if (!keepsVisual)
        return `low confidence in the target component, fallback "${rule.fallback}"`;
    }
  }
  return null;
}

export function conflictKey(rule: Rule): string | null {
  const a = rule.action;
  if (a.type === "set-token") return `token:${a.token}`;
  if (a.type === "emphasize" || a.type === "de-emphasize") return `emph:${a.target}`;
  return null;
}

/** Builds the ordered list of rules to apply, and says why every other rule was skipped. */
export function buildPlan(input: PlanInput): Plan {
  const skipped: SkippedRule[] = [];
  let pool: Rule[] = [];
  for (const rule of selectCandidates(input)) {
    const why = input.disabledRules?.includes(rule.id)
      ? "turned off by you in the options"
      : (input.blockedRules?.[rule.id] ?? blocker(rule, input));
    if (why) skipped.push({ ruleId: rule.id, reason: why });
    else pool.push(rule);
  }

  // Dependencies: a rule needs all its dependencies in the plan (repeat until stable).
  for (let changed = true; changed;) {
    changed = false;
    const ids = new Set(pool.map((r) => r.id));
    pool = pool.filter((r) => {
      const missing = r.dependencies.find((d) => !ids.has(d));
      if (missing === undefined) return true;
      skipped.push({ ruleId: r.id, reason: `dependency "${missing}" not applied` });
      changed = true;
      return false;
    });
  }

  // Conflicts: highest priority wins; ties broken by id so results are deterministic.
  const sorted = [...pool].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const winners = new Map<string, Rule>();
  const entries: Plan["entries"] = [];
  for (const rule of sorted) {
    const key = conflictKey(rule);
    const winner = key ? winners.get(key) : undefined;
    if (winner) {
      skipped.push({
        ruleId: rule.id,
        reason: `conflicts with higher-priority rule "${winner.id}"`,
      });
      continue;
    }
    if (key) winners.set(key, rule);
    entries.push({ rule });
  }
  return { entries, skipped };
}
