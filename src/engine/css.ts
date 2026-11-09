import type { EffectCatalog, Plan } from "./types";

export const NS = "xsuit";
export const STYLE_ID = "xsuit-style";
const UNSAFE = /[{}<>]|url\(|@import|expression\(|javascript:|\/\*/i;

/** Effects are data. Only plain "property: value" declarations are accepted. */
export function safeDeclaration(d: string): boolean {
  return !UNSAFE.test(d) && /^[a-z-]+\s*:\s*[^;]+$/i.test(d.trim());
}

/**
 * CSS for the plan. Every selector starts with html[data-xsuit] so nothing can leak onto
 * the page, and only attributes set by the engine are matched.
 */
export function buildCss(plan: Plan, effects: EffectCatalog): string {
  const seen = new Set<string>();
  const blocks: string[] = [];
  const add = (selector: string, key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const decls = (effects[key] ?? []).filter(safeDeclaration);
    if (decls.length)
      blocks.push(
        `html[data-${NS}] ${selector} { ${decls.map((d) => `${d.trim()} !important`).join("; ")}; }`,
      );
  };
  for (const { rule } of plan.entries) {
    const a = rule.action;
    if (a.type === "set-token")
      add(`[data-${NS}-${a.token}="${a.value}"]`, `${a.token}=${a.value}`);
    else if (a.type === "emphasize" || a.type === "de-emphasize") {
      const level = a.strength ?? "medium";
      const attr = a.type === "emphasize" ? "emph" : "deemph";
      add(`[data-${NS}-${attr}="${level}"]`, `${a.type}=${level}`);
    }
  }
  return blocks.join("\n");
}
