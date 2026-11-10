import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const json = (p: string) => JSON.parse(read(p));

describe("docs stay in sync with the data", () => {
  const rules = [...json("rules/western.json").rules, ...json("rules/china.json").rules];
  const count = (l: string) =>
    rules.filter((r: { evidence: { level: string } }) => r.evidence.level === l).length;

  it("the evidence audit totals match the rules (run `npm run evidence` if this fails)", () => {
    const line = read("docs/07-evidence-audit.md").match(/\*\*Totals:\*\* (.+)/)![1]!;
    expect(line).toBe(
      `${rules.length} rules: ${count("strong")} strong, ${count("moderate")} moderate, ${count("emerging")} emerging, ${count("hypothesis")} hypothesis.`,
    );
  });

  it("every source in the audit table has the right verified status", () => {
    const audit = read("docs/07-evidence-audit.md");
    for (const s of json("rules/sources.json")) {
      const row = audit.split("\n").find((l) => l.startsWith(`| ${s.id}`));
      expect(row, s.id).toBeDefined();
      expect(/\| yes/.test(row!), s.id).toBe(s.verified);
    }
  });
});

describe("sources: nothing is 'verified' without a date", () => {
  for (const s of json("rules/sources.json")) {
    it(s.id, () => {
      if (s.verified) expect(s.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      else expect(Array.isArray(s.attempts) || s.attempts === undefined).toBe(true);
    });
  }
});

describe("documentation links", () => {
  const pages = ["README.md", "SECURITY.md", "docs/README.md", "docs/HANDOFF.md"];
  for (const page of pages) {
    it(`${page}: relative links point to existing files`, () => {
      const links = [...read(page).matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)]
        .map((m) => m[1]!)
        .filter((l) => !/^[a-z]+:/i.test(l));
      for (const l of links)
        expect(existsSync(join(root, dirname(page), l)), `${page} -> ${l}`).toBe(true);
    });
  }
  it("every numbered doc is listed in docs/README.md", () => {
    const index = read("docs/README.md");
    for (const f of readdirSync(join(root, "docs")).filter((x) => /^\d\d-/.test(x)))
      expect(index, f).toContain(f);
  });
  it("the root README exists and points to the security policy", () => {
    expect(read("README.md")).toContain("SECURITY.md");
  });
});
