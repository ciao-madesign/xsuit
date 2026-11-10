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

export { FORBIDDEN_PROPERTIES } from "./forbidden";

export function toCatalog(file: EffectFile = effectFile): EffectCatalog {
  const catalog: EffectCatalog = {};
  for (const e of file.effects) catalog[e.key] = e.declarations;
  return catalog;
}

export const defaultEffects: EffectCatalog = toCatalog();
