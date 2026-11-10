import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeHost, normalizeSettings, sitePatterns } from "../src/shared/settings";
import { safeFilePart } from "../src/metrics/metrics";
import { isProtected } from "../src/engine/protect";
import { isSafeShortcut } from "../src/engine/safety";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });

describe("security invariants: manifest", () => {
  const m = JSON.parse(read("public/manifest.json"));
  it("asks for no host access up front, and only https when asked", () => {
    expect(m.host_permissions).toBeUndefined();
    expect(m.content_scripts).toBeUndefined();
    expect(m.optional_host_permissions).toEqual(["https://*/*"]);
  });
  it("uses a minimal permission set", () => {
    expect([...m.permissions].sort()).toEqual(["activeTab", "scripting", "storage"]);
  });
  it("exposes nothing to web pages", () => {
    expect(m.web_accessible_resources).toBeUndefined();
    expect(m.externally_connectable).toBeUndefined();
  });
  it("has a strict CSP with no remote or inline code", () => {
    const csp: string = m.content_security_policy.extension_pages;
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/unsafe-|https?:|\*/);
  });
});

describe("security invariants: source code", () => {
  const FORBIDDEN: [RegExp, string][] = [
    [/\beval\s*\(/, "eval"],
    [/new\s+Function\s*\(/, "Function constructor"],
    [/\.(innerHTML|outerHTML)\s*=/, "innerHTML/outerHTML write"],
    [/insertAdjacentHTML/, "insertAdjacentHTML"],
    [/document\.write/, "document.write"],
    [/\bfetch\s*\(/, "fetch"],
    [/XMLHttpRequest/, "XMLHttpRequest"],
    [/\bWebSocket\b/, "WebSocket"],
    [/sendBeacon/, "sendBeacon"],
    [/importScripts/, "importScripts"],
    [/chrome\.(cookies|history|webRequest|downloads|management)/, "sensitive API"],
    [/chrome\.tabs\.executeScript/, "legacy script injection"],
    [/chrome\.scripting\.executeScript\s*\(\s*\{[^}]*func/, "dynamic function injection"],
    [/createElement\(["'](script|iframe|object|embed)["']\)/, "script/frame loading"],
  ];
  for (const f of files(join(root, "src"))) {
    it(`${f.slice(root.length + 1)} uses no forbidden API`, () => {
      const code = readFileSync(f, "utf8");
      for (const [re, name] of FORBIDDEN) expect(code, name).not.toMatch(re);
    });
  }
  it("focus is moved only inside xsuit's own label", () => {
    for (const f of files(join(root, "src")))
      if (!/ui\/overlay\.ts$/.test(f))
        expect(readFileSync(f, "utf8"), f).not.toMatch(/\.focus\s*\(/);
  });
  it("event listeners on page elements exist only on buttons xsuit creates itself", () => {
    for (const f of files(join(root, "src/engine")).concat(
      files(join(root, "src/analyzer")),
      files(join(root, "src/adapters")),
    ))
      if (!/engine\/apply\.ts$/.test(f))
        expect(readFileSync(f, "utf8"), f).not.toMatch(/addEventListener/);
    const apply = readFileSync(join(root, "src/engine/apply.ts"), "utf8");
    expect(apply.match(/addEventListener/g)).toHaveLength(1);
    expect(apply).toMatch(/btn\.addEventListener/);
  });
  it("screenshots are captured only by the developer popup module (not in the release build), and shown only as inline PNG", () => {
    for (const f of files(join(root, "src")))
      // shared/features.ts only lists the API name for the feature check (B21); it never calls it.
      if (!f.endsWith("popup/dev.ts") && !f.endsWith("shared/features.ts"))
        expect(readFileSync(f, "utf8"), f).not.toMatch(/captureVisibleTab/);
    expect(read("src/report/index.ts")).toContain("data:image\\/png;base64");
  });
  it("contains no network addresses in code", () => {
    for (const f of files(join(root, "src"))) {
      const code = readFileSync(f, "utf8").replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
      expect(code, f).not.toMatch(/["'`]https?:\/\/[a-z]/i);
    }
  });
  it("HTML pages load only local scripts and no inline script", () => {
    for (const p of ["popup", "options", "report"]) {
      const html = read(`public/${p}.html`);
      expect(html).not.toMatch(/<script(?![^>]*\ssrc="[a-z.]+\.js")/i);
      expect(html).not.toMatch(/\son[a-z]+\s*=/i);
      expect(html).not.toMatch(/(src|href)="https?:/i);
    }
  });
});

describe("security invariants: code that runs inside web pages never acts for the user", () => {
  // Everything except the extension's own pages (popup, options, report) and the service worker.
  const PAGE_CODE = (f: string) => !/src\/(popup|options|report|pages|background)\//.test(f);
  const FORBIDDEN_IN_PAGE: [RegExp, string][] = [
    [
      /createElement\(["'](form|input|img|link|meta|textarea|select)["']\)/,
      "creating forms, inputs or images",
    ],
    [/\.click\s*\(/, "programmatic click"],
    [/window\.open|\bopen\s*\(\s*["'`]http/, "window.open"],
    [/location\.(assign|replace|reload)\s*\(|location(\.href)?\s*=[^=]/, "navigation"],
    [/\.submit\s*\(|requestSubmit/, "form submission"],
    [/dispatchEvent|new\s+(Mouse|Pointer|Keyboard|Touch|Input)Event/, "synthetic events"],
    [/execCommand|navigator\.clipboard|\.select\s*\(\)|\.setSelectionRange/, "clipboard/selection"],
  ];
  for (const f of files(join(root, "src")).filter(PAGE_CODE))
    it(`${f.slice(root.length + 1)}`, () => {
      const code = readFileSync(f, "utf8").replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
      for (const [re, name] of FORBIDDEN_IN_PAGE) expect(code, name).not.toMatch(re);
    });
});

describe("hosts and settings", () => {
  it("rejects hosts that are too broad or not real sites", () => {
    for (const bad of ["co.uk", "com.cn", "github.io", "127.0.0.1", "10.0.0.1", "a.1", "x.123"])
      expect(normalizeHost(bad), bad).toBeNull();
    expect(sitePatterns("co.uk")).toEqual([]);
    expect(normalizeHost("bbc.co.uk")).toBe("bbc.co.uk");
  });
  it("caps stored lists", () => {
    const many = Array.from({ length: 5000 }, (_, i) => `s${i}.example.com`);
    expect(normalizeSettings({ enabledSites: many }).enabledSites.length).toBeLessThanOrEqual(500);
  });
  it("makes file names safe", () => {
    expect(safeFilePart("../../evil/<x>.com")).not.toMatch(/[/<>]|^\./);
    expect(safeFilePart("../a")).not.toContain("/");
  });
});

describe("shortcut links", () => {
  const HOST = "example.com";
  const ok = (href: string, inner = "", text = "Latest news") => {
    document.body.innerHTML = `<div>${inner}<a id="x" href="${href}">${text}</a></div>`;
    const a = document.getElementById("x")!;
    return !isProtected(a) && isSafeShortcut(a, text, HOST, `https://${HOST}/`);
  };
  it("accepts plain same-site links", () => {
    expect(ok("/news")).toBe(true);
    expect(ok("https://example.com/a")).toBe(true);
    expect(ok("https://news.example.com/a")).toBe(true);
  });
  it("rejects script, data, blob, file, credentials and hidden-character tricks", () => {
    for (const bad of [
      "javascript:alert(1)",
      "  JaVaScRiPt:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,x",
      "blob:https://a/b",
      "file:///etc/passwd",
      "https://user:pw@example.com/",
      "#",
      "",
    ])
      expect(ok(bad), bad).toBe(false);
  });
  it("rejects links to another site", () => {
    expect(ok("https://evil.test/offer")).toBe(false);
    expect(ok("https://example.com.evil.test/")).toBe(false);
  });
  it("rejects links that log out, delete, pay, download or unsubscribe", () => {
    for (const bad of [
      "/account/logout",
      "/delete?id=1",
      "/pay",
      "/x?action=unsubscribe",
      "/tool.exe",
      "/get/setup.msi",
    ])
      expect(ok(bad), bad).toBe(false);
  });
  it("rejects links inside protected areas", () => {
    expect(ok("/ok", '<form action="/login"><input type="password"/>')).toBe(false);
  });
});
