import { describe as d, expect, it } from "vitest";
import { describe, EXTENSION_NAME } from "../src/shared/version";

d("version", () => {
  it("names the extension", () => {
    expect(EXTENSION_NAME).toBe("xsuit");
    expect(describe()).toContain("xsuit");
  });
});
