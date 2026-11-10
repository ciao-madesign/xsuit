import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateObservation } from "../src/research/observation";

const dir = "research/observations";
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
function sheets(d: string): string[] {
  if (!existsSync(d)) return [];
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory()
      ? sheets(p)
      : p.endsWith(".json") && f !== "template.json"
        ? [p]
        : [];
  });
}

describe("observation sheets", () => {
  it("the empty template is not a valid sheet (placeholders must be filled)", () => {
    expect(validateObservation(load(`${dir}/template.json`)).length).toBeGreaterThan(0);
  });
  it("accepts a filled sheet and requires notes when something was observed", () => {
    const s = load(`${dir}/template.json`);
    Object.assign(s, {
      platform: "Example",
      observedOn: "2026-11-12",
      observer: "A",
      browser: "Chrome 130",
      limits: "One account, one day.",
    });
    expect(validateObservation(s)).toEqual([]);
    s.conventions.density = { status: "present", note: "" };
    expect(validateObservation(s).join()).toContain("needs a note");
  });
  it("every committed sheet is valid", () => {
    for (const f of sheets(dir)) expect(validateObservation(load(f)), f).toEqual([]);
  });
});
