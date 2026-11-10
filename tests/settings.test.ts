import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  isSiteEnabled,
  normalizeHost,
  normalizeSettings,
  sitePatterns,
  withSite,
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
      enabledSites: ["https://www.B.com", "a.com", "a.com", 5, "bad host"],
    });
    expect(s).toEqual({
      enabled: false,
      profile: "china",
      depth: "structural",
      enabledSites: ["a.com", "b.com"],
      disabledRules: [],
      labelPosition: "bottom-left",
      hybridRules: null,
    });
  });
});

describe("per-site opt-in", () => {
  const s = withSite(DEFAULT_SETTINGS, "www.example.com", true);
  it("matches the site and its subdomains only", () => {
    expect(isSiteEnabled(s, "example.com")).toBe(true);
    expect(isSiteEnabled(s, "shop.example.com")).toBe(true);
    expect(isSiteEnabled(s, "notexample.com")).toBe(false);
  });
  it("can be removed again", () => {
    expect(withSite(s, "example.com", false).enabledSites).toEqual([]);
  });
  it("builds match patterns for the site and subdomains", () => {
    expect(sitePatterns("example.com")).toEqual(["*://example.com/*", "*://*.example.com/*"]);
  });
  it("no site is enabled by default", () => expect(DEFAULT_SETTINGS.enabledSites).toEqual([]));
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
  const on = { ...DEFAULT_SETTINGS, profile: "western" as const };
  it("reports each state", () => {
    expect(computeStatus(on, "chrome://x").kind).toBe("unsupported");
    expect(computeStatus({ ...on, enabled: false }, url).kind).toBe("off");
    expect(computeStatus(DEFAULT_SETTINGS, url).kind).toBe("original");
    expect(computeStatus(on, url).kind).toBe("not-enabled");
    expect(computeStatus(withSite(on, "example.com", true), url).kind).toBe("active");
  });
  it("apply-once works without enabling the site, but never when off or original", () => {
    expect(computeStatus(on, url, true).kind).toBe("active");
    expect(computeStatus({ ...on, enabled: false }, url, true).kind).toBe("off");
    expect(computeStatus(DEFAULT_SETTINGS, url, true).kind).toBe("original");
  });
});
