import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIREFOX_ID, manifestFor, outDir, TARGETS } from "../scripts/targets.mjs";
import { missingApis, OPTIONAL_APIS, REQUIRED_APIS, ifAvailable } from "../src/shared/features";

const base = JSON.parse(readFileSync("public/manifest.json", "utf8"));
const SECURITY_KEYS = [
  "manifest_version",
  "permissions",
  "optional_host_permissions",
  "host_permissions",
  "content_scripts",
  "content_security_policy",
  "options_page",
  "action",
  "version",
  "name",
];

describe("one source manifest, three targets", () => {
  it.each(TARGETS)("%s keeps every security-relevant key identical to the source", (t) => {
    const m = manifestFor(t, base);
    for (const k of SECURITY_KEYS) expect(m[k], `${t}: ${k}`).toEqual(base[k]);
  });

  it.each(TARGETS)(
    "%s has the same invariants: minimal permissions, no site access by default",
    (t) => {
      const m = manifestFor(t, base);
      expect(m.manifest_version).toBe(3);
      expect(m.permissions).toEqual(["storage", "activeTab", "scripting"]);
      expect(m.host_permissions).toBeUndefined();
      expect(m.content_scripts).toBeUndefined();
      expect(m.optional_host_permissions).toEqual(["https://*/*"]);
      expect(m.content_security_policy.extension_pages).not.toMatch(/unsafe|https?:|\*/);
      expect(m.web_accessible_resources).toBeUndefined();
    },
  );

  it("Chrome and Edge share one manifest; Firefox differs only in the listed keys", () => {
    expect(manifestFor("edge", base)).toEqual(manifestFor("chrome", base));
    expect(manifestFor("chrome", base)).toEqual(base);
    const f = manifestFor("firefox", base);
    const diff = Object.keys({ ...base, ...f }).filter(
      (k) => JSON.stringify(base[k]) !== JSON.stringify(f[k]),
    );
    expect(diff.sort()).toEqual([
      "background",
      "browser_specific_settings",
      "minimum_chrome_version",
    ]);
    expect(f.background).toEqual({ scripts: ["background.js"] });
  });

  it("Firefox declares an id, a minimum version and that no data is collected", () => {
    const g = manifestFor("firefox", base).browser_specific_settings.gecko;
    expect(g.id).toBe(FIREFOX_ID);
    expect(g.strict_min_version).toMatch(/^\d+\.\d+$/);
    expect(g.data_collection_permissions).toEqual({ required: ["none"] });
  });

  it("does not change the source manifest and rejects unknown targets", () => {
    const copy = structuredClone(base);
    manifestFor("firefox", base);
    expect(base).toEqual(copy);
    expect(() => manifestFor("safari", base)).toThrow();
  });
});

describe("a build per target", () => {
  it.each(TARGETS)(
    "%s builds, and every file the manifest names exists",
    (t) => {
      execFileSync("node", ["scripts/build.mjs", `--target=${t}`], { stdio: "pipe" });
      const dir = outDir(t);
      const m = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8"));
      const files = [
        m.action.default_popup,
        m.options_page,
        m.background.service_worker ?? m.background.scripts[0],
        "content.js",
        "report.html",
      ];
      for (const f of files) expect(existsSync(`${dir}/${f}`), `${t}: ${f}`).toBe(true);
      // The built code never loads remote code or evaluates strings.
      for (const js of ["background.js", "content.js", "popup.js", "options.js", "report.js"]) {
        const code = readFileSync(`${dir}/${js}`, "utf8");
        expect(code, `${t}: ${js}`).not.toMatch(/\beval\(|new Function\(|importScripts\(/);
      }
    },
    30000,
  );
});

describe("feature checks", () => {
  const full = {
    storage: { local: {}, session: {} },
    runtime: { sendMessage() {} },
    tabs: { query() {}, sendMessage() {}, captureVisibleTab() {} },
    scripting: {
      executeScript() {},
      registerContentScripts() {},
      unregisterContentScripts() {},
      getRegisteredContentScripts() {},
    },
    permissions: { request() {}, contains() {}, remove() {}, onAdded: {}, onRemoved: {} },
  };

  it("finds nothing missing when every API is there", () => {
    expect(missingApis([...REQUIRED_APIS, ...OPTIONAL_APIS], full)).toEqual([]);
  });

  it("names exactly the missing APIs", () => {
    const partial = Object.fromEntries(
      Object.entries(full).map(([k, v]) => [k, { ...v }]),
    ) as Record<string, Record<string, unknown>>;
    delete partial.tabs!.captureVisibleTab;
    delete partial.permissions!.onAdded;
    expect(missingApis([...REQUIRED_APIS, ...OPTIONAL_APIS], partial)).toEqual([
      "tabs.captureVisibleTab",
      "permissions.onAdded",
    ]);
    expect(missingApis(REQUIRED_APIS, {})).toHaveLength(REQUIRED_APIS.length);
    expect(missingApis(REQUIRED_APIS, undefined as never)).toBeDefined();
  });

  it("an optional feature falls back instead of throwing", () => {
    expect(ifAvailable("tabs.captureVisibleTab", () => "shot", "none", {})).toBe("none");
    expect(ifAvailable("tabs.captureVisibleTab", () => "shot", "none", full)).toBe("shot");
  });

  it("every chrome.* API used in src is listed as required or optional", () => {
    const used = new Set<string>();
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = `${d}/${f}`;
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".ts"))
          for (const m of readFileSync(p, "utf8").matchAll(
            /chrome\.(storage\.(?:local|session)|[a-zA-Z]+\.[a-zA-Z]+)/g,
          ))
            used.add(m[1]!);
      }
    };
    walk("src");
    const known = new Set<string>([...REQUIRED_APIS, ...OPTIONAL_APIS]);
    const eventsAndTypes = new Set([
      "storage.onChanged",
      "runtime.onInstalled",
      "runtime.onStartup",
      "runtime.onMessage",
      "runtime.getURL",
      "runtime.id",
      "tabs.create",
      "tabs.Tab",
      "storage.local",
      "google.com",
      "permissions.onAdded",
      "permissions.onRemoved",
    ]);
    for (const u of used) expect(known.has(u) || eventsAndTypes.has(u), u).toBe(true);
  });
});
