import type { Rule } from "../rules/types";
import { conflictKey } from "./plan";

/**
 * Hybrid composition is explicit (decision #43) and conflicts are blocked, not resolved (#44):
 * a rule cannot be added while a selected rule changes the same thing (same token or same target).
 * Returns the id of the selected rule that blocks `ruleId`, or null.
 */
export function hybridBlockedBy(
  ruleId: string,
  selected: string[],
  allRules: Rule[],
): string | null {
  const rule = allRules.find((r) => r.id === ruleId);
  const key = rule ? conflictKey(rule) : null;
  if (!key) return null;
  for (const id of selected) {
    if (id === ruleId) continue;
    const other = allRules.find((r) => r.id === id);
    if (other && conflictKey(other) === key) return id;
  }
  return null;
}

/** Drops rules that conflict with an earlier one (used to clean up stored compositions). */
export function withoutConflicts(ids: string[], allRules: Rule[]): string[] {
  const out: string[] = [];
  for (const id of ids) if (!hybridBlockedBy(id, out, allRules)) out.push(id);
  return out;
}
