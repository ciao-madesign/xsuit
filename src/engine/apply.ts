import type { A11yGuard, Snapshot } from "./a11y";
import { buildCss, NS, STYLE_ID } from "./css";
import type { Journal } from "./journal";
import { isProtected } from "./protect";
import type { ApplyReport, EffectCatalog, Plan, Resolver } from "./types";

/** Remembers which (rule, element) pairs are done, so applying twice changes nothing. */
export type AppliedState = WeakMap<Element, Set<string>>;

const MAX_CHECKED_PER_RULE = 100; // keeps the guard cheap on very large pages

function isDone(el: Element, ruleId: string, state: AppliedState): boolean {
  return state.get(el)?.has(ruleId) ?? false;
}
function markDone(el: Element, ruleId: string, state: AppliedState): void {
  const done = state.get(el) ?? new Set<string>();
  done.add(ruleId);
  state.set(el, done);
}

export function applyPlan(
  doc: Document,
  plan: Plan,
  resolve: Resolver,
  effects: EffectCatalog,
  journal: Journal,
  state: AppliedState,
  profile: string,
  guard: A11yGuard | null = null,
): ApplyReport {
  const report: ApplyReport = {
    applied: [],
    unsupported: [],
    protectedSkipped: 0,
    guard: { checked: 0, unverifiable: 0, reverted: [] },
  };
  const root = doc.documentElement;

  // 1. Decide what will be touched, and take the "before" measurements while the page is untouched.
  type Todo = { ruleId: string; els: { el: Element; component: string }[]; snaps: Snapshot[] };
  const todo: Todo[] = [];
  for (const { rule } of plan.entries) {
    const a = rule.action;
    const visual = a.type === "set-token" || a.type === "emphasize" || a.type === "de-emphasize";
    if (!visual) {
      report.unsupported.push({
        ruleId: rule.id,
        reason: `action "${a.type}" arrives in build B9`,
      });
      continue;
    }
    const targets = a.type === "set-token" ? rule.components : [a.target!];
    const els: Todo["els"] = [];
    const seen = new Set<Element>();
    for (const component of targets) {
      for (const el of resolve(component)) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (isProtected(el)) {
          report.protectedSkipped++;
          continue;
        }
        if (!isDone(el, rule.id, state)) els.push({ el, component });
      }
    }
    const snaps = guard ? els.slice(0, MAX_CHECKED_PER_RULE).map((x) => guard.snapshot(x.el)) : [];
    todo.push({ ruleId: rule.id, els, snaps });
  }
  const hadOverflow = guard?.overflowsHorizontally() ?? false;

  // 2. Apply, tagging every change with its rule.
  if (!root.hasAttribute(`data-${NS}`)) journal.setAttr(root, `data-${NS}`, profile);
  const ruleOf = new Map(plan.entries.map((e) => [e.rule.id, e.rule]));
  for (const t of todo) {
    const rule = ruleOf.get(t.ruleId)!;
    const a = rule.action;
    for (const { el, component } of t.els) {
      markDone(el, rule.id, state);
      if (!el.hasAttribute(`data-${NS}-c`)) journal.setAttr(el, `data-${NS}-c`, component, rule.id);
      if (a.type === "set-token") journal.setAttr(el, `data-${NS}-${a.token}`, a.value!, rule.id);
      else
        journal.setAttr(
          el,
          `data-${NS}-${a.type === "emphasize" ? "emph" : "deemph"}`,
          a.strength ?? "medium",
          rule.id,
        );
    }
  }

  // 3. One namespaced style element, created once and replaced as the plan changes.
  const writeCss = (entries: Plan["entries"]) => {
    let style = doc.getElementById(STYLE_ID);
    const css = buildCss({ entries, skipped: [] }, effects);
    if (css && !style) {
      style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = css;
      journal.insert(doc.head ?? root, style);
    } else if (style && style.textContent !== css) {
      style.textContent = css;
    }
  };
  writeCss(plan.entries);

  // 4. Accessibility guard: undo what measurably got worse, and say why.
  const reverted = new Map<string, string>();
  const undo = (ruleId: string, reason: string) => {
    journal.rollbackTag(ruleId);
    for (const t of todo)
      if (t.ruleId === ruleId) for (const { el } of t.els) state.get(el)?.delete(ruleId);
    reverted.set(ruleId, reason);
  };
  if (guard) {
    for (const t of todo) {
      for (const snap of t.snaps) {
        const res = guard.compare(snap);
        report.guard.checked++;
        report.guard.unverifiable += res.unverifiable;
        if (res.problems.length && !reverted.has(t.ruleId))
          undo(t.ruleId, `undone by the accessibility check: ${res.problems[0]!.detail}`);
      }
    }
    if (!hadOverflow && guard.overflowsHorizontally()) {
      // Something made the page scroll sideways. Undo rules, lowest priority first, until it stops.
      for (const t of [...todo].reverse()) {
        if (reverted.has(t.ruleId) || t.els.length === 0) continue;
        undo(t.ruleId, "undone by the accessibility check: the page started to scroll sideways");
        writeCss(plan.entries.filter((e) => !reverted.has(e.rule.id)));
        if (!guard.overflowsHorizontally()) break;
      }
    }
    if (reverted.size) writeCss(plan.entries.filter((e) => !reverted.has(e.rule.id)));
  }

  for (const t of todo) {
    if (reverted.has(t.ruleId)) continue;
    report.applied.push({ ruleId: t.ruleId, elements: t.els.length });
  }
  // Rules that were already applied on an earlier run stay listed with their element count.
  for (const [ruleId, reason] of reverted) report.guard.reverted.push({ ruleId, reason });
  return report;
}
