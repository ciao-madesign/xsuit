import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("manifest is MV3 with minimal permissions", () => {
  const m = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  expect(m.manifest_version).toBe(3);
  expect(m.permissions).toEqual(["storage", "activeTab", "scripting"]);
  // No site access by default: nothing in host_permissions, no static content script.
  expect(m.host_permissions).toBeUndefined();
  expect(m.content_scripts).toBeUndefined();
  expect(m.optional_host_permissions).toEqual(["http://*/*", "https://*/*"]);
});
