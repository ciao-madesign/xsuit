import { describe, expect, it } from "vitest";
import { measurePage } from "../src/metrics/metrics";
import { checkMeasurementFile } from "../src/research/privacy";

const good = () => ({
  schema: "xsuit.metrics/2",
  capturedAt: "2026-11-10T10:00:00.000Z",
  page: { host: "example.com", pageType: "home", lang: "en" },
  viewport: { width: 1280, height: 800 },
  hasLayout: true,
  sampledElements: 10,
  metrics: { linkCount: 3, meanSaturation: null },
  definitions: { linkCount: "Visible links." },
});

describe("research privacy gate", () => {
  it("accepts a clean file", () => expect(checkMeasurementFile(good()).ok).toBe(true));
  it("rejects a URL path, extra fields and non-numeric metrics", () => {
    const a = good();
    (a.page as Record<string, unknown>).path = "/user/john.doe/invoices";
    expect(checkMeasurementFile(a).ok).toBe(false);
    expect(checkMeasurementFile({ ...good(), title: "Inbox of John" }).ok).toBe(false);
    const b = good();
    (b.metrics as Record<string, unknown>).text = "hello";
    expect(checkMeasurementFile(b).ok).toBe(false);
  });
  it("cleans legacy v1 files: the path is dropped, the page type becomes unknown", () => {
    const old = {
      ...good(),
      schema: "xsuit.metrics/1",
      page: { host: "example.com", path: "/secret/42", lang: "en" },
    };
    const r = checkMeasurementFile(old);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r.cleaned)).not.toContain("secret");
    expect((r.cleaned as { page: { pageType: string } }).page.pageType).toBe("unknown");
  });
  it("rejects hostile host or language values", () => {
    for (const page of [
      { host: "a.com/path?token=1", pageType: "home", lang: "en" },
      { host: "example.com", pageType: "Home Page!", lang: "en" },
      { host: "example.com", pageType: "home", lang: "john@mail.com" },
    ])
      expect(checkMeasurementFile({ ...good(), page }).ok).toBe(false);
  });
  it("a real measurement never contains the URL path", () => {
    document.body.innerHTML = "<p>hello</p>";
    const json = JSON.stringify(measurePage(document));
    expect(json).not.toContain(location.pathname === "/" ? "\u0000" : location.pathname);
    // The test page is "localhost": not a valid research host, so the gate refuses it; with a
    // real host the same file passes.
    const m = JSON.parse(json);
    expect(checkMeasurementFile(m).ok).toBe(false);
    m.page.host = "example.com";
    expect(checkMeasurementFile(m).ok).toBe(true);
  });
});
