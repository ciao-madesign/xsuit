import effectsJson from "../../rules/effects.json";
import type { EffectCatalog } from "./types";

export interface EffectEntry {
  key: string;
  /** Standard strength (the default). */
  declarations: string[];
  /** Weaker and stronger values of the same effect (P3). Only effects with a magnitude have them. */
  levels?: { light: string[]; strong: string[] };
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

export const INTENSITIES = ["light", "standard", "strong"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export function toCatalog(
  file: EffectFile = effectFile,
  intensity: Intensity = "standard",
): EffectCatalog {
  const catalog: EffectCatalog = {};
  for (const e of file.effects)
    catalog[e.key] =
      intensity === "standard" ? e.declarations : (e.levels?.[intensity] ?? e.declarations);
  return catalog;
}

export const defaultEffects: EffectCatalog = toCatalog();
