import type { A11yGuard, Snapshot } from "./a11y";
import { buildCss, NS, STYLE_ID } from "./css";
import type { Journal } from "./journal";
import { isProtected } from "./protect";
import { isActionRisky, isNotice, isSafeShortcut } from "./safety";
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

const MIN_SHORTCUTS = 3;
const MAX_SHORTCUTS = 6;
const collapsedAttr = `data-${NS}-collapsed`;

/** Hides a block behind a small toggle; the content stays in the page and one click shows it. */
function collapse(doc: Document, journal: Journal, el: Element, component: string, tag: string) {
  const parent = el.parentNode;
  if (!parent) return false;
  journal.setAttr(el, `data-${NS}-c`, component, tag);
  journal.setAttr(el, collapsedAttr, "1", tag);
  const btn = doc.createElement("button");
  btn.type = "button";
  btn.setAttribute(`data-${NS}-toggle`, "");
  const sync = () => {
    const closed = el.getAttribute(collapsedAttr) === "1";
    btn.setAttribute("aria-expanded", String(!closed));
    btn.textContent = `${closed ? "Show" : "Hide"} ${component.replace(/-/g, " ")}`;
  };
  sync();
  btn.addEventListener("click", () => {
    journal.setAttr(el, collapsedAttr, el.getAttribute(collapsedAttr) === "1" ? "0" : "1", tag);
    sync();
  });
  journal.insertBefore(parent, btn, el, tag);
  return true;
}

/**
 * Moves `el` only when that is reliable: it must share a parent with the reference element
 * (for before/after), so no layout container is crossed. Returns false when nothing was moved.
 */
function reorder(journal: Journal, el: Element, position: string, refs: Element[], tag: string) {
  const parent = el.parentNode;
  if (!parent) return false;
  // Never reshuffle a container that holds a warning, dialog or protected area.
  for (const sib of Array.from(parent.children))
    if (sib !== el && (isNotice(sib) || isProtected(sib))) return false;
  if (position === "first" || position === "last") {
    const ref = position === "first" ? parent.firstChild : null;
    if (ref === el || (position === "last" && !el.nextSibling)) return false;
    journal.move(el, parent, ref, tag);
    return true;
  }
  const ref = refs.find((r) => r !== el && r.parentNode === parent);
  if (!ref) return false;
  const next = position === "before" ? ref : ref.nextSibling;
  if (next === el || (position === "after" && ref.nextSibling === el)) return false;
  journal.move(el, parent, next, tag);
  return true;
}

/** Wraps components that already share one parent in a single container; otherwise does nothing. */
function group(doc: Document, journal: Journal, members: Element[], tag: string) {
  const parent = members[0]?.parentNode;
  if (!parent || members.length < 2 || members.some((m) => m.parentNode !== parent)) return false;
  const box = doc.createElement("div");
  box.setAttribute(`data-${NS}-group`, "");
  journal.insertBefore(parent, box, members[0]!, tag);
  for (const m of members) journal.move(m, box, null, tag);
  return true;
}

/** Copies up to a few existing, safe links (text + address) from the source blocks. */
function shortcutLinks(sources: Element[]): { text: string; href: string }[] {
  const out: { text: string; href: string }[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    if (isProtected(src) || isActionRisky(src)) continue;
    const pageHost = src.ownerDocument.defaultView?.location.hostname ?? "";
    for (const a of Array.from(src.querySelectorAll("a[href]"))) {
      const text = (a.textContent ?? "").replace(/\s+/g, " ").trim();
      const href = a.getAttribute("href") ?? "";
      if (!text || text.length > 30 || seen.has(text)) continue;
      if (isProtected(a) || !isSafeShortcut(a, text, pageHost, src.ownerDocument.baseURI)) continue;
      seen.add(text);
      out.push({ text, href });
      if (out.length === MAX_SHORTCUTS) return out;
    }
  }
  return out;
}

function insertShortcuts(
  doc: Document,
  journal: Journal,
  before: Element,
  links: { text: string; href: string }[],
  tag: string,
): void {
  const parent = before.parentNode;
  if (!parent) return;
  const nav = doc.createElement("nav");
  nav.setAttribute(`data-${NS}-shortcuts`, "");
  nav.setAttribute("aria-label", "Shortcuts added by xsuit");
  nav.title = "Shortcuts added by xsuit: copies of links already on this page";
  const note = doc.createElement("span");
  note.textContent = "xsuit shortcuts:";
  nav.appendChild(note);
  for (const l of links) {
    const a = doc.createElement("a");
    a.setAttribute("href", l.href);
    a.setAttribute("rel", "noopener noreferrer");
    // Always say where the link goes, so nobody is surprised by the destination.
    try {
      const u = new URL(l.href, doc.baseURI);
      a.title = `Goes to ${u.hostname}${u.pathname}`;
    } catch {
      /* the href was validated before; nothing to show */
    }
    a.textContent = l.text;
    nav.appendChild(a);
  }
  journal.insertBefore(parent, nav, before, tag);
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
  const structural: Record<string, true> = { collapse: true, "surface-shortcut": true };
  const todo: Todo[] = [];
  for (const { rule } of plan.entries) {
    const a = rule.action;
    const visual = a.type === "set-token" || a.type === "emphasize" || a.type === "de-emphasize";
    if (!visual && !structural[a.type] && a.type !== "reorder" && a.type !== "group") {
      report.unsupported.push({
        ruleId: rule.id,
        reason: `action "${a.type}" is not implemented in V1 (decision #37)`,
      });
      continue;
    }
    const targets =
      a.type === "set-token"
        ? rule.components
        : a.type === "surface-shortcut"
          ? [a.to!]
          : a.type === "group"
            ? a.targets!
            : [a.target!];
    const els: Todo["els"] = [];
    const seen = new Set<Element>();
    for (const component of targets) {
      for (const el of resolve(component)) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (isProtected(el) || (a.type !== "set-token" && isActionRisky(el))) {
          report.protectedSkipped++;
          continue;
        }
        if (!isDone(el, rule.id, state)) els.push({ el, component });
      }
      if (a.type === "surface-shortcut") els.splice(1); // one strip per page
    }
    if (a.type === "group") {
      // One group per page; only when every listed component was found (else not reliable).
      const found = targets.filter((c) => els.some((x) => x.component === c));
      els.splice(0, els.length, ...(found.length === targets.length ? els : []));
    }
    // Structural changes hide or add content: the contrast check has nothing to compare, but
    // target size and keyboard reachability are still checked.
    const snaps = guard
      ? els.slice(0, MAX_CHECKED_PER_RULE).map((x) => guard.snapshot(x.el, { contrast: visual }))
      : [];
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
      if (a.type === "collapse") {
        if (!collapse(doc, journal, el, component, rule.id)) continue;
        markDone(el, rule.id, state);
        continue;
      }
      if (a.type === "reorder") {
        if (!reorder(journal, el, a.position!, a.relativeTo ? resolve(a.relativeTo) : [], rule.id))
          continue;
        markDone(el, rule.id, state);
        continue;
      }
      if (a.type === "group") {
        const members = t.els.map((x) => x.el);
        if (el !== members[0]) continue; // handled once, from the first member
        if (!group(doc, journal, members, rule.id)) continue;
        for (const m of members) markDone(m, rule.id, state);
        continue;
      }
      if (a.type === "surface-shortcut") {
        const links = shortcutLinks(resolve(a.target!));
        if (links.length < MIN_SHORTCUTS) continue;
        markDone(el, rule.id, state);
        insertShortcuts(doc, journal, el, links, rule.id);
        continue;
      }
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
    guard.refresh();
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
