import { describe, expect, it } from "vitest";
import { replicationCheck, type MetricFile } from "../src/research/replication";

const types = ["home", "search-results", "article"];
const mk = (site: string, v: number, pageType = "home"): MetricFile => ({
  site,
  pageType,
  metrics: { mediaPer1000Px: v, mainBlocks: v, peripheralBlocks: v },
});

describe("replication check (A3)", () => {
  it("says 'insufficient' with too few measurements (no conclusions from nothing)", () => {
    expect(replicationCheck([]).every((r) => r.verdict === "insufficient")).toBe(true);
    expect(replicationCheck([mk("google", 1), mk("baidu", 5)])[0]!.verdict).toBe("insufficient");
  });
  it("replicated when China is higher with enough sites, not replicated otherwise", () => {
    const on = (sites: string[], v: number) =>
      sites.flatMap((s) => types.slice(0, 2).map((t) => mk(s, v, t)));
    const west = on(["google", "amazon", "bbc"], 2);
    const high = on(["baidu", "taobao", "bilibili"], 6);
    const low = on(["baidu", "taobao", "bilibili"], 1);
    expect(replicationCheck([...west, ...high])[0]!.verdict).toBe("replicated");
    expect(replicationCheck([...west, ...low])[0]!.verdict).toBe("not-replicated");
  });
  it("counts distinct sites, not files: many pages of one site are not enough", () => {
    const one = types.map((t) => mk("google", 2, t));
    const west = [...one, ...one, ...one];
    const china = ["baidu", "taobao", "bilibili"].flatMap((s) => types.map((t) => mk(s, 6, t)));
    const r = replicationCheck([...west, ...china])[0]!;
    expect(r.verdict).toBe("insufficient");
    expect(r.west.n).toBe(1);
    expect(r.reason).toMatch(/distinct sites/);
  });
  it("needs more than one page type per side", () => {
    const west = ["google", "amazon", "bbc"].map((s) => mk(s, 2, "home"));
    const china = ["baidu", "taobao", "bilibili"].map((s) => mk(s, 6, "home"));
    const r = replicationCheck([...west, ...china])[0]!;
    expect(r.verdict).toBe("insufficient");
    expect(r.reason).toMatch(/page types/);
  });
  it("gives each site one vote: an outlier-heavy site cannot decide alone", () => {
    const types2 = ["home", "article"];
    const west = ["google", "amazon", "bbc"].flatMap((s) => types2.map((t) => mk(s, 5, t)));
    const china = [
      ...types2.map((t) => mk("baidu", 100, t)),
      ...types2.map((t) => mk("taobao", 1, t)),
      ...types2.map((t) => mk("bilibili", 1, t)),
      ...Array.from({ length: 10 }, () => mk("baidu", 100, "home")),
    ];
    expect(replicationCheck([...west, ...china])[0]!.verdict).toBe("not-replicated");
  });
});
