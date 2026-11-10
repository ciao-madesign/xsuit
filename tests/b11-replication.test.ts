import { describe, expect, it } from "vitest";
import { replicationCheck, type MetricFile } from "../src/research/replication";

const mk = (site: string, v: number): MetricFile => ({
  site,
  metrics: { mediaPer1000Px: v, mainBlocks: v, peripheralBlocks: v },
});

describe("replication check (A3)", () => {
  it("says 'insufficient' with too few measurements (no conclusions from nothing)", () => {
    expect(replicationCheck([]).every((r) => r.verdict === "insufficient")).toBe(true);
    expect(replicationCheck([mk("google", 1), mk("baidu", 5)])[0]!.verdict).toBe("insufficient");
  });
  it("replicated when China is higher with enough sites, not replicated otherwise", () => {
    const west = ["google", "amazon", "bbc"].map((s) => mk(s, 2));
    const high = ["baidu", "taobao", "bilibili"].map((s) => mk(s, 6));
    const low = ["baidu", "taobao", "bilibili"].map((s) => mk(s, 1));
    expect(replicationCheck([...west, ...high])[0]!.verdict).toBe("replicated");
    expect(replicationCheck([...west, ...low])[0]!.verdict).toBe("not-replicated");
  });
});
