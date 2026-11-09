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
const DESCENDANTS = ["img", "picture", "video", "a"];

/** Splits "image-prominence=high@img" into its base key and optional allowed descendant. */
export function parseEffectKey(key: string): { base: string; descendant: string | null } | null {
  const [base, desc, ...rest] = key.split("@");
  if (!base || rest.length) return null;
  if (desc !== undefined && !DESCENDANTS.includes(desc)) return null;
  return { base, descendant: desc ?? null };
}

/**
 * CSS for the plan. Every selector starts with html[data-xsuit] so nothing can leak onto
 * the page, and only attributes set by the engine are matched.
 */
export function buildCss(plan: Plan, effects: EffectCatalog): string {
  const seen = new Set<string>();
  const blocks: string[] = [];
  const add = (attrSelector: string, baseKey: string) => {
    if (seen.has(baseKey)) return;
    seen.add(baseKey);
    for (const [key, raw] of Object.entries(effects)) {
      const parsed = parseEffectKey(key);
      if (!parsed || parsed.base !== baseKey) continue;
      const decls = raw.filter(safeDeclaration);
      if (!decls.length) continue;
      const target = parsed.descendant ? `${attrSelector} ${parsed.descendant}` : attrSelector;
      blocks.push(
        `html[data-${NS}] ${target} { ${decls.map((d) => `${d.trim()} !important`).join("; ")}; }`,
      );
    }
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
