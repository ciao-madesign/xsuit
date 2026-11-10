import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(d: string): string[] {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });
}

describe("privacy: the extension code never sends data out (spec 15)", () => {
  const FORBIDDEN =
    /\b(fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts\s*\()/;
  it("no network API appears in the source", () => {
    for (const f of files("src")) expect(readFileSync(f, "utf8"), f).not.toMatch(FORBIDDEN);
  });
  it("the manifest asks for no host access up front and loads no remote code", () => {
    const m = JSON.parse(readFileSync("public/manifest.json", "utf8"));
    expect(m.host_permissions).toBeUndefined();
    expect(m.content_scripts).toBeUndefined();
    expect(JSON.stringify(m)).not.toMatch(/https?:\/\/[^*]/);
    expect(m.content_security_policy).toBeUndefined();
  });
  it("pages and scripts shipped in public/ load nothing from other origins", () => {
    for (const f of readdirSync("public").filter((x) => /\.(html|css)$/.test(x)))
      expect(readFileSync(join("public", f), "utf8"), f).not.toMatch(
        /(src|href)="https?:|url\(\s*https?:/,
      );
  });
});
