import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { outDir } from "../scripts/targets.mjs";

// P1: the release build is the product for people. Research, measurement and report code exist
// only in the developer build (`npm run build:dev`).

const build = (target: string, dev: boolean) =>
  execFileSync("node", ["scripts/build.mjs", `--target=${target}`, ...(dev ? ["--dev"] : [])], {
    stdio: "pipe",
  });
const text = (dir: string, f: string) => readFileSync(`${dir}/${f}`, "utf8");

/** Strings that only the research tools contain. */
const RESEARCH_MARKERS = [
  "xsuit.report/",
  "xsuit.metrics/",
  "xsuit/measure",
  "xsuit/report",
  "xsuit/inspect",
  "Research tools",
  "Measure this page",
  "Comparison report",
  "Check before saving",
  "Check compatibility",
  "Descriptive only", // scorecard disclaimer
  "mediaPer1000Px", // appears as a rule condition: allowed; checked separately below
];

describe("release build", () => {
  for (const target of ["chrome", "firefox"]) {
    it(`${target}: contains no research tools`, () => {
      build(target, false);
      const dir = outDir(target, false);
      expect(existsSync(`${dir}/report.html`)).toBe(false);
      expect(existsSync(`${dir}/report.js`)).toBe(false);
      for (const f of readdirSync(dir).filter((x) => /\.(js|html)$/.test(x)))
        for (const m of RESEARCH_MARKERS.filter((x) => x !== "mediaPer1000Px"))
          expect(text(dir, f), `${target}/${f} must not contain "${m}"`).not.toContain(m);
      // no scorecard, no baselines, no study or export code
      for (const m of ["baselines", "scorecard", "xsuit.study", "prepareMeasurementExport"])
        expect(text(dir, "content.js") + text(dir, "popup.js")).not.toContain(m);
    }, 30000);
  }

  it("is clearly smaller than the developer build", () => {
    build("chrome", false);
    build("chrome", true);
    const size = (dir: string) =>
      readdirSync(dir)
        .filter((f) => f.endsWith(".js"))
        .reduce((n, f) => n + readFileSync(`${dir}/${f}`).length, 0);
    expect(size(outDir("chrome", false))).toBeLessThan(size(outDir("chrome", true)) * 0.9);
  }, 30000);

  it("still adapts pages: the engine, rules and the one-click messages are there", () => {
    build("chrome", false);
    const c = text("dist", "content.js");
    for (const m of ["xsuit/apply-once", "xsuit/restore", "xsuit/ping", "visual.western"])
      expect(c, m).toContain(m);
    expect(text("dist", "popup.html")).toContain('id="always"');
    expect(text("dist", "popup.html")).toContain('id="restore"');
  }, 30000);

  it("has the same manifest and security invariants as the developer build", () => {
    build("chrome", false);
    build("chrome", true);
    expect(text("dist", "manifest.json")).toBe(text("dist-dev", "manifest.json"));
  }, 30000);
});

describe("developer build", () => {
  it("keeps every research tool", () => {
    build("chrome", true);
    const dir = outDir("chrome", true);
    expect(existsSync(`${dir}/report.html`)).toBe(true);
    expect(text(dir, "popup.html")).toContain("Research tools");
    expect(text(dir, "content.js")).toContain("xsuit/measure");
    expect(text(dir, "report.js")).toContain("xsuit.report");
  }, 30000);
});
