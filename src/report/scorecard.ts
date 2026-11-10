// Scorecard: where a page sits, dimension by dimension, relative to two studied samples.
// DESCRIPTIVE ONLY. It is not a quality score, not a usability measure and not a ranking of
// markets: a number is shown only where the sources give one, and everything else says so.

import type { Dimension } from "../rules/configuration";
import type { Profile } from "../rules/types";

export interface BaselineEntry {
  west: number;
  china: number;
  source: { id: string };
}
export type Baselines = Record<string, BaselineEntry>;

export type Nearest = "western" | "china" | "in-between";

export interface ScorecardRow {
  dimension: string;
  name: string;
  family: string;
  measured: { metric: string; before: number | null; after: number | null }[];
  /** Sample means from the studies, when they give a number for a metric of this dimension. */
  reference: {
    metric: string;
    west: number;
    china: number;
    source: string;
    provisional: true;
  } | null;
  /** 0 = at the Western sample mean, 1 = at the China sample mean (can go beyond). */
  position: { before: number | null; after: number | null } | null;
  nearest: { before: Nearest | null; after: Nearest | null } | null;
  /** Pole each reference configuration chooses for this dimension. */
  poles: { western: string | null; china: string | null };
  note: string;
}

export interface Scorecard {
  disclaimer: string;
  rows: ScorecardRow[];
}

export const SCORECARD_DISCLAIMER =
  "Descriptive only. These numbers show where this page sits relative to two studied samples of municipal homepages. They are not a measure of quality or usability, and neither sample is better or worse than the other.";

const round = (n: number) => Math.round(n * 1000) / 1000;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function nearestOf(t: number | null): Nearest | null {
  if (t === null) return null;
  if (Math.abs(t - 0.5) < 0.15) return "in-between";
  return t < 0.5 ? "western" : "china";
}

export function buildScorecard(
  before: Record<string, unknown>,
  after: Record<string, unknown> | null,
  dimensions: Dimension[],
  baselines: Baselines,
  profiles: Pick<Profile, "id" | "configuration">[],
): Scorecard {
  const cfg = (id: string) => profiles.find((p) => p.id === id)?.configuration ?? {};
  const rows: ScorecardRow[] = dimensions.map((d) => {
    const metrics = d.measures ?? [];
    const measured = metrics.map((metric) => ({
      metric,
      before: num(before[metric]),
      after: after ? num(after[metric]) : null,
    }));
    const refMetric = metrics.find((m) => baselines[m]);
    const b = refMetric ? baselines[refMetric] : undefined;
    const base = {
      dimension: d.id,
      name: d.name,
      family: d.family,
      measured,
      poles: { western: cfg("western")[d.id] ?? null, china: cfg("china")[d.id] ?? null },
    };
    if (!b || !refMetric || b.west === b.china)
      return {
        ...base,
        reference: null,
        position: null,
        nearest: null,
        note: metrics.length
          ? "Measured here, but the sources give a direction, not a number, so there is nothing to compare with."
          : "No page metric describes this dimension yet.",
      };
    const at = (v: number | null) => (v === null ? null : round((v - b.west) / (b.china - b.west)));
    const m = measured.find((x) => x.metric === refMetric)!;
    const pb = at(m.before);
    const pa = at(m.after);
    return {
      ...base,
      reference: {
        metric: refMetric,
        west: b.west,
        china: b.china,
        source: b.source.id,
        provisional: true,
      },
      position: { before: pb, after: pa },
      nearest: { before: nearestOf(pb), after: nearestOf(pa) },
      note: "Reference values are sample means from one study (provisional); our metric is an approximation of the study's.",
    };
  });
  return { disclaimer: SCORECARD_DISCLAIMER, rows };
}
