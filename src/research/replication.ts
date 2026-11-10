// A3 replication check: do real commercial sites show the same direction as the study's
// institutional homepages? Input: our own measurement files, grouped by market.
// Nothing here invents data: with too few measurements the answer is "insufficient".

/** Distinct SITES needed on each side (not files: three pages of one site count once). */
export const MIN_SITES_PER_SIDE = 3;
/** Distinct page types needed on each side, so one kind of page cannot decide the result. */
export const MIN_PAGE_TYPES_PER_SIDE = 2;

export const WESTERN_SITES = [
  "google",
  "amazon",
  "bbc",
  "guardian",
  "youtube",
  "reddit",
  "instagram",
];
export const CHINA_SITES = [
  "baidu",
  "taobao",
  "alibaba",
  "bilibili",
  "caixin",
  "weibo",
  "rednote",
  "xiaohongshu",
  "wechat",
];

/** Direction reported by Li 2026 (China higher than West) for indicators we operationalise. */
export const STUDY_DIRECTIONS: { metric: string; study: string; rules: string[] }[] = [
  {
    metric: "mediaPer1000Px",
    study: "visual density 38.21 (CN) vs 12.87 (West)",
    rules: ["visual.western.spacious-density", "visual.china.compact-density"],
  },
  {
    metric: "mainBlocks",
    study: "main blocks 5.91 vs 3.14",
    rules: ["structure.china.surface-shortcuts"],
  },
  {
    metric: "peripheralBlocks",
    study: "peripheral blocks 1.61 vs 0.61",
    rules: ["structure.western.collapse-sidebar"],
  },
];

export interface MetricFile {
  site: string;
  /** Page-type label of the measurement ("home", "search-results"...). Missing = unknown. */
  pageType?: string;
  metrics: Record<string, number | null>;
}

export interface Side {
  /** Distinct sites with a value for this metric. */
  n: number;
  /** Distinct known page types behind those values. */
  pageTypes: number;
  /** Median of the per-site medians: every site has the same weight. */
  median: number | null;
}

export interface Replication {
  metric: string;
  study: string;
  rules: string[];
  west: Side;
  china: Side;
  verdict: "replicated" | "not-replicated" | "insufficient";
  /** Why the answer is "insufficient", in plain words. */
  reason?: string;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function sideOf(files: MetricFile[], list: string[], metric: string): Side {
  const perSite = new Map<string, number[]>();
  const types = new Set<string>();
  for (const f of files) {
    const site = f.site.toLowerCase();
    const v = f.metrics[metric];
    if (!list.includes(site) || typeof v !== "number" || !Number.isFinite(v)) continue;
    perSite.set(site, [...(perSite.get(site) ?? []), v]);
    if (f.pageType && f.pageType !== "unknown") types.add(f.pageType);
  }
  const siteValues = [...perSite.values()].map((v) => median(v)!);
  return { n: perSite.size, pageTypes: types.size, median: median(siteValues) };
}

export function replicationCheck(files: MetricFile[]): Replication[] {
  return STUDY_DIRECTIONS.map(({ metric, study, rules }) => {
    const west = sideOf(files, WESTERN_SITES, metric);
    const china = sideOf(files, CHINA_SITES, metric);
    let reason: string | undefined;
    if (west.n < MIN_SITES_PER_SIDE || china.n < MIN_SITES_PER_SIDE)
      reason = `needs ${MIN_SITES_PER_SIDE} distinct sites per side (have ${west.n} and ${china.n})`;
    else if (west.pageTypes < MIN_PAGE_TYPES_PER_SIDE || china.pageTypes < MIN_PAGE_TYPES_PER_SIDE)
      reason = `needs ${MIN_PAGE_TYPES_PER_SIDE} page types per side (have ${west.pageTypes} and ${china.pageTypes})`;
    return {
      metric,
      study,
      rules,
      west,
      china,
      reason,
      verdict:
        reason || west.median === null || china.median === null
          ? "insufficient"
          : china.median > west.median
            ? "replicated"
            : "not-replicated",
    };
  });
}
