import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module shared with the lock script
import { hashes } from "../scripts/lock-data.mjs";

describe("rules, adapters and schemas cannot change without review", () => {
  it("match rules/integrity.json (after a reviewed change, run `npm run lock`)", () => {
    const lock = JSON.parse(readFileSync("rules/integrity.json", "utf8")).files as Record<
      string,
      string
    >;
    const now = hashes() as Record<string, string>;
    expect(Object.keys(now).sort()).toEqual(Object.keys(lock).sort());
    for (const [file, hash] of Object.entries(now))
      expect(lock[file], `${file} changed`).toBe(hash);
  });
});
