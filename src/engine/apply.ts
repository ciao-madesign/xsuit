import type { Journal } from "./journal";
import { buildCss, NS, STYLE_ID } from "./css";
import { isProtected } from "./protect";
import type { ApplyReport, EffectCatalog, Plan, Resolver } from "./types";
import type { Rule } from "../rules/types";

/** Remembers which (rule, element) pairs are done, so applying twice changes nothing. */
export type AppliedState = WeakMap<Element, Set<string>>;

function mark(el: Element, rule: Rule, state: AppliedState): boolean {
  const done = state.get(el) ?? new Set<string>();
  if (done.has(rule.id)) return false;
  done.add(rule.id);
  state.set(el, done);
  return true;
}

export function applyPlan(
  doc: Document,
  plan: Plan,
  resolve: Resolver,
  effects: EffectCatalog,
  journal: Journal,
  state: AppliedState,
  profile: string,
): ApplyReport {
  const report: ApplyReport = { applied: [], unsupported: [], protectedSkipped: 0 };
  const root = doc.documentElement;
  if (!root.hasAttribute(`data-${NS}`)) journal.setAttr(root, `data-${NS}`, profile);

  for (const { rule } of plan.entries) {
    const a = rule.action;
    const visual = a.type === "set-token" || a.type === "emphasize" || a.type === "de-emphasize";
    if (!visual) {
      report.unsupported.push({
        ruleId: rule.id,
        reason: `action "${a.type}" arrives in build B6`,
      });
      continue;
    }
    // Which components does this action touch?
    const targets = a.type === "set-token" ? rule.components : [a.target!];
    let count = 0;
    for (const component of targets) {
      for (const el of resolve(component)) {
        if (isProtected(el)) {
          report.protectedSkipped++;
          continue;
        }
        if (!mark(el, rule, state)) continue;
        if (!el.hasAttribute(`data-${NS}-c`)) journal.setAttr(el, `data-${NS}-c`, component);
        if (a.type === "set-token") journal.setAttr(el, `data-${NS}-${a.token}`, a.value!);
        else
          journal.setAttr(
            el,
            `data-${NS}-${a.type === "emphasize" ? "emph" : "deemph"}`,
            a.strength ?? "medium",
          );
        count++;
      }
    }
    report.applied.push({ ruleId: rule.id, elements: count });
  }

  // One namespaced style element, created once and replaced as the plan changes.
  let style = doc.getElementById(STYLE_ID);
  const css = buildCss(plan, effects);
  if (css && !style) {
    style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    journal.insert(doc.head ?? root, style);
  } else if (style && style.textContent !== css) {
    style.textContent = css;
  }
  return report;
}
