/**
 * Properties effects may never use. They could lower contrast, hide content, break layout or
 * targets, remove focus indicators, or add motion. Enforced at runtime (css.ts) and in tests.
 */
export const FORBIDDEN_PROPERTIES = [
  "color",
  "background",
  "background-color",
  "background-image",
  "opacity",
  "display",
  "visibility",
  "position",
  "pointer-events",
  "cursor",
  "user-select",
  "font-size",
  "height",
  "max-height",
  "min-height",
  "overflow",
  "overflow-x",
  "overflow-y",
  "clip",
  "clip-path",
  "content",
  "transform",
  "z-index",
  "box-shadow",
  "animation",
  "animation-name",
  "animation-duration",
  "transition",
  "transition-property",
  "scroll-behavior",
];

/** Allowed only with a harmless value: an outline may be added but never removed or hidden. */
const OUTLINE = /^outline(-(color|style|width|offset))?$/;
const REMOVES_OUTLINE = /^(none|hidden|0|0px|transparent)\b/i;
/** Widths may only fill the container; a fixed width could clip content at 200 % zoom or shrink a target. */
const WIDTH = /^(min-|max-)?width$/;
const SAFE_WIDTH = /^(100%|auto)$/i;

/** True if the declaration ("prop: value") uses a forbidden property or a harmful value. */
export function usesForbiddenProperty(declaration: string): boolean {
  const [name = "", ...rest] = declaration.split(":");
  const prop = name.trim().toLowerCase();
  const value = rest
    .join(":")
    .trim()
    .replace(/\s*!important\s*$/i, "");
  if (FORBIDDEN_PROPERTIES.includes(prop) || /^(animation|transition)-/.test(prop)) return true;
  if (OUTLINE.test(prop)) return REMOVES_OUTLINE.test(value);
  if (WIDTH.test(prop)) return !SAFE_WIDTH.test(value);
  return false;
}
