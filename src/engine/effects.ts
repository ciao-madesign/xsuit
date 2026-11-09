import effectsJson from "../../rules/effects.json";
import type { EffectCatalog } from "./types";

export interface EffectEntry {
  key: string;
  declarations: string[];
  basis: string;
  constraints: string[];
  ruleIds: string[];
}

export interface EffectFile {
  version: string;
  note: string;
  effects: EffectEntry[];
  intentionallyEmpty: { key: string; reason: string; ruleIds: string[] }[];
}

export const effectFile = effectsJson as EffectFile;

/** Properties effects may never use: they could lower contrast, hide content, or break layout/targets. */
export const FORBIDDEN_PROPERTIES = [
  "color",
  "background",
  "background-color",
  "opacity",
  "display",
  "visibility",
  "position",
  "pointer-events",
  "font-size",
  "height",
  "max-height",
  "min-height",
  "overflow",
  "clip",
  "clip-path",
  "content",
  "transform",
  "z-index",
];

export function toCatalog(file: EffectFile = effectFile): EffectCatalog {
  const catalog: EffectCatalog = {};
  for (const e of file.effects) catalog[e.key] = e.declarations;
  return catalog;
}

export const defaultEffects: EffectCatalog = toCatalog();
