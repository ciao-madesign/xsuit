import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  isExcluded,
  normalizeHost,
  normalizeSettings,
  withExclusion,
} from "../src/shared/settings";
import { checkPageSupport } from "../src/shared/support";
import { computeStatus } from "../src/shared/state";

describe("normalizeHost", () => {
  it("cleans URLs and www", () => {
    expect(normalizeHost("https://www.Example.com/x?y=1")).toBe("example.com");
    expect(normalizeHost("WWW.example.com")).toBe("example.com");
  });
  it("rejects garbage", () => {
    for (const bad of ["", "localhost", "not a host", "http://", "a_b.com"]) {
      expect(normalizeHost(bad)).toBeNull();
    }
  });
});

describe("normalizeSettings", () => {
  it("falls back to defaults on corrupted data", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("x")).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ enabled: "yes", profile: "mars", depth: 3 })).toEqual(
      DEFAULT_SETTINGS,
    );
  });
  it("keeps valid values and cleans excluded domains", () => {
    const s = normalizeSettings({
      enabled: false,
      profile: "china",
      depth: "structural",
      excludedDomains: ["https://www.B.com", "a.com", "a.com", 5, "bad host"],
    });
    expect(s).toEqual({
      enabled: false,
      profile: "china",
      depth: "structural",
      excludedDomains: ["a.com", "b.com"],
    });
  });
});

describe("exclusion", () => {
  const s = withExclusion(DEFAULT_SETTINGS, "www.example.com", true);
  it("matches the domain and its subdomains only", () => {
    expect(isExcluded(s, "example.com")).toBe(true);
    expect(isExcluded(s, "shop.example.com")).toBe(true);
    expect(isExcluded(s, "notexample.com")).toBe(false);
  });
  it("can be removed again", () => {
    expect(withExclusion(s, "example.com", false).excludedDomains).toEqual([]);
  });
});

describe("page support", () => {
  it("rejects internal, file and store pages with a message", () => {
    for (const url of [
      "chrome://extensions",
      "file:///a.html",
      "about:blank",
      "chrome-extension://abc/popup.html",
      "https://chromewebstore.google.com/detail/x",
      undefined,
      "not a url",
    ]) {
      const r = checkPageSupport(url);
      expect(r.supported).toBe(false);
      expect(r.reason).toBeTruthy();
    }
  });
  it("accepts http and https", () => {
    expect(checkPageSupport("https://www.google.com/search?q=x")).toEqual({
      supported: true,
      host: "www.google.com",
    });
  });
});

describe("computeStatus", () => {
  const url = "https://www.example.com/";
  it("reports each state", () => {
    expect(computeStatus(DEFAULT_SETTINGS, "chrome://x").kind).toBe("unsupported");
    expect(computeStatus({ ...DEFAULT_SETTINGS, enabled: false }, url).kind).toBe("off");
    expect(computeStatus(withExclusion(DEFAULT_SETTINGS, "example.com", true), url).kind).toBe(
      "excluded",
    );
    expect(computeStatus(DEFAULT_SETTINGS, url).kind).toBe("original");
    expect(computeStatus({ ...DEFAULT_SETTINGS, profile: "western" }, url).kind).toBe("active");
  });
});
