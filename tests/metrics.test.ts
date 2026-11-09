import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  countTextUnits,
  measurePage,
  measurementFileName,
  METRIC_DEFINITIONS,
  parseColor,
  rgbToHsl,
} from "../src/metrics/metrics";
import { summarize } from "../src/popup/summary";

describe("helpers", () => {
  it("counts words and CJK characters as text units", () => {
    expect(countTextUnits("Hello brave new world")).toBe(4);
    expect(countTextUnits("今日新闻")).toBe(4);
    expect(countTextUnits("今日 news 新闻 today")).toBe(6);
    expect(countTextUnits("  — … ")).toBe(0);
  });
  it("parses rgb and rgba colours only", () => {
    expect(parseColor("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("rgba(0, 0, 0, 0)")?.a).toBe(0);
    expect(parseColor("rgb(10 20 30 / 50%)")?.a).toBe(0.5);
    expect(parseColor("red")).toBeNull();
  });
  it("converts to HSL", () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(rgbToHsl(128, 128, 128).s).toBe(0);
    expect(Math.round(rgbToHsl(0, 0, 255).h)).toBe(240);
  });
});

describe("measurePage on a synthetic dense page", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = readFileSync("tests/fixtures/dense.html", "utf8");
    document.documentElement.lang = "zh";
  });
  const m = () => measurePage(document, new Date("2026-11-09T10:00:00.000Z"));

  it("is deterministic", () => {
    expect(m()).toEqual(m());
  });
  it("counts visible media and ignores hidden content", () => {
    const x = m().metrics;
    expect(x.imageCount).toBe(5); // a, b, two QR images, footer image; hidden one excluded
    expect(x.videoCount).toBe(1);
  });
  it("counts blocks: outermost main sections and peripheral asides", () => {
    const x = m().metrics;
    expect(x.mainBlocks).toBe(3); // nested article not double counted, hidden section excluded
    expect(x.peripheralBlocks).toBe(1);
  });
  it("detects autoplay and QR codes", () => {
    const x = m().metrics;
    expect(x.autoplayCount).toBe(1);
    expect(x.qrCodeCount).toBe(2);
  });
  it("measures links, underlines and footer", () => {
    const x = m().metrics;
    expect(x.linkCount).toBe(4);
    expect(x.footerLinkCount).toBe(2);
    expect(x.underlinedLinkRatio).toBeCloseTo(1 / 3, 2); // 3 text links, 1 underlined
  });
  it("counts text without scripts or hidden text, and derives ratios", () => {
    const x = m().metrics;
    // 首页 新闻 头条 今日新闻内容 推荐 = 2+2+2+6+2 = 14 CJK; Hello world again nested Side About us = 7 words
    expect(x.textUnits).toBe(21);
    expect(x.headingsPer1000Text).toBeCloseTo((2 / 21) * 1000, 1);
    expect(x.paragraphsPer1000Text).toBeCloseTo((4 / 21) * 1000, 1);
  });
  it("sees colour", () => {
    const x = m().metrics;
    expect(x.meanSaturation).toBeGreaterThan(0);
    expect(x.distinctHues).toBeGreaterThanOrEqual(1);
  });
  it("says so when there is no layout instead of inventing numbers", () => {
    const r = m();
    expect(r.hasLayout).toBe(false);
    expect(r.metrics.mediaPer1000Px).toBeNull();
    expect(r.metrics.whitespaceRatio).toBeNull();
  });
  it("keeps no page text and drops the query string", () => {
    const r = m();
    const json = JSON.stringify({ ...r, definitions: undefined });
    expect(json).not.toContain("今日");
    expect(json).not.toContain("Hello");
    expect(Object.keys(r.page)).toEqual(["host", "path", "lang"]);
  });
  it("every metric has a written definition", () => {
    for (const k of Object.keys(m().metrics)) expect(METRIC_DEFINITIONS[k], k).toBeTruthy();
  });
  it("produces a file name and a popup summary", () => {
    const r = m();
    expect(measurementFileName(r)).toMatch(/__2026-11-09T10-00-00\.json$/);
    for (const [label, value] of summarize(r)) {
      expect(label.length).toBeGreaterThan(3);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
