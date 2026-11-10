// A market profile is a CONFIGURATION: for each dimension (density, palette, hierarchy...) one
// pole, or nothing (keep the page as it is). Rules belong to one pole of one dimension. The
// engine only ever sees the resulting list of rules; adding a market adds a configuration,
// not engine code (decision #53).

import type { Rule } from "./types";

export interface Pole {
  id: string;
  name: string;
  description: string;
}
export interface Dimension {
  id: string;
  name: string;
  family: "visual" | "information-architecture";
  description: string;
  poles: Pole[];
  /** Page metrics that describe this dimension (our own approximate operationalisation). */
  measures?: string[];
}
/** dimension id -> pole id. A dimension that is missing keeps the page as it is. */
export type Configuration = Record<string, string>;

/** The rules a configuration selects, in the order of `rules` (so plans stay deterministic). */
export function rulesForConfiguration(config: Configuration, rules: Rule[]): Rule[] {
  return rules.filter((r) => config[r.dimension] === r.pole);
}

/** Problems with a configuration against the known dimensions; empty = valid. */
export function checkConfiguration(config: unknown, dimensions: Dimension[]): string[] {
  if (typeof config !== "object" || config === null || Array.isArray(config))
    return ["configuration must be an object"];
  const out: string[] = [];
  for (const [dim, pole] of Object.entries(config)) {
    const d = dimensions.find((x) => x.id === dim);
    if (!d) out.push(`unknown dimension "${dim}"`);
    else if (typeof pole !== "string" || !d.poles.some((p) => p.id === pole))
      out.push(`dimension "${dim}" has no pole "${String(pole)}"`);
  }
  return out;
}

/** Keeps only valid choices (used for stored settings), so bad data can never reach the planner. */
export function sanitizeConfiguration(config: unknown, dimensions: Dimension[]): Configuration {
  const out: Configuration = {};
  if (typeof config !== "object" || config === null) return out;
  for (const [dim, pole] of Object.entries(config)) {
    const d = dimensions.find((x) => x.id === dim);
    if (d && typeof pole === "string" && d.poles.some((p) => p.id === pole)) out[dim] = pole;
  }
  return out;
}

/** Which configuration a list of rule ids amounts to (to move old rule-by-rule Hybrid choices over). */
export function configurationForRules(ids: string[], rules: Rule[]): Configuration {
  const out: Configuration = {};
  for (const id of ids) {
    const r = rules.find((x) => x.id === id);
    if (r && out[r.dimension] === undefined) out[r.dimension] = r.pole;
  }
  return out;
}
