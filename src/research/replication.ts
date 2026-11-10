// A3 replication check: do real commercial sites show the same direction as the study's
// institutional homepages? Input: our own measurement files, grouped by market.
// Nothing here invents data: with too few measurements the answer is "insufficient".

export const MIN_PER_SIDE = 3;

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
  metrics: Record<string, number | null>;
}

export interface Replication {
  metric: string;
  study: string;
  rules: string[];
  west: { n: number; median: number | null };
  china: { n: number; median: number | null };
  verdict: "replicated" | "not-replicated" | "insufficient";
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function replicationCheck(files: MetricFile[]): Replication[] {
  const side = (list: string[], metric: string) =>
    files
      .filter((f) => list.includes(f.site.toLowerCase()))
      .map((f) => f.metrics[metric])
      .filter((v): v is number => typeof v === "number");
  return STUDY_DIRECTIONS.map(({ metric, study, rules }) => {
    const w = side(WESTERN_SITES, metric);
    const c = side(CHINA_SITES, metric);
    const mw = median(w);
    const mc = median(c);
    const enough = w.length >= MIN_PER_SIDE && c.length >= MIN_PER_SIDE;
    return {
      metric,
      study,
      rules,
      west: { n: w.length, median: mw },
      china: { n: c.length, median: mc },
      verdict:
        !enough || mw === null || mc === null
          ? "insufficient"
          : mc > mw
            ? "replicated"
            : "not-replicated",
    };
  });
}
