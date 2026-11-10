import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020";
import { describe, expect, it, vi } from "vitest";
import { measurePage, METRIC_DEFINITIONS, type Measurement } from "../src/metrics/metrics";
import { buildReport } from "../src/report/report";
import { prepareMeasurementExport, prepareReportExport } from "../src/research/exportGate";
import { validateObservation } from "../src/research/observation";
import { scanForPersonalData } from "../src/research/personal";
import { checkMeasurementFile, checkReportFile } from "../src/research/privacy";
import { showPreview } from "../src/pages/exportPreview";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ajv = new Ajv({ strict: true, allErrors: true });
const validMeasurement = ajv.compile(load("schemas/measurement.schema.json"));
const validReport = ajv.compile(load("schemas/report.schema.json"));

/** A real measurement of a page, with the test host replaced by a real-looking one. */
function measure(html: string): Measurement {
  document.documentElement.innerHTML = html;
  const m = measurePage(document);
  m.page.host = "example.com";
  return m;
}
const PAGE = `<head><title>Inbox of Jane Doe</title></head><body><header><nav>${"<a href='/u/1'>Home</a>".repeat(4)}</nav></header><main><p>Hello</p></main></body>`;
const rules = [
  { id: "visual.china.vivid-palette", title: "Vivid palette", evidence: { level: "emerging" } },
] as never;
const report = (m: Measurement) =>
  buildReport({
    profile: "china",
    depth: "visual",
    pageType: "home",
    before: m,
    after: m,
    changes: [{ ruleId: "visual.china.vivid-palette", elements: 2 }],
    reverted: [],
    skipped: [{ ruleId: "visual.china.compact-density", reason: "page already at the target" }],
    allRules: rules,
  });

describe("the schemas are closed and agree with the gate", () => {
  it("a real measurement is valid in both the schema and the runtime gate", () => {
    const m = measure(PAGE);
    expect(validMeasurement(m), JSON.stringify(validMeasurement.errors)).toBe(true);
    expect(checkMeasurementFile(m).ok).toBe(true);
  });
  it("schema metric names are exactly the ones xsuit measures and defines", () => {
    const schema = load("schemas/measurement.schema.json");
    const keys = Object.keys(measure(PAGE).metrics).sort();
    expect(Object.keys(schema.properties.metrics.properties).sort()).toEqual(keys);
    expect(Object.keys(schema.properties.definitions.properties).sort()).toEqual(
      Object.keys(METRIC_DEFINITIONS).sort(),
    );
  });
  it("extra fields are rejected by BOTH (URL path, page text, title, per-element data)", () => {
    for (const extra of [
      { path: "/u/jane" },
      { title: "Inbox of Jane" },
      { text: "hello" },
      { elements: [1] },
    ]) {
      const m = { ...measure(PAGE), ...extra };
      expect(validMeasurement(m), JSON.stringify(extra)).toBe(false);
      expect(checkMeasurementFile(m).ok, JSON.stringify(extra)).toBe(false);
    }
    const m = measure(PAGE);
    (m.page as Record<string, unknown>).path = "/u/jane";
    expect(validMeasurement(m)).toBe(false);
    expect(checkMeasurementFile(m).ok).toBe(false);
  });
  it("a real report is valid in both, and extra fields are rejected by both", () => {
    const r = report(measure(PAGE));
    expect(validReport(r), JSON.stringify(validReport.errors)).toBe(true);
    expect(checkReportFile(r).ok).toBe(true);
    for (const bad of [
      { ...r, screenshots: ["data:image/png;base64,AAAA"] },
      { ...r, page: { ...r.page, path: "/x" } },
      { ...r, url: "https://example.com/a?b=1" },
    ]) {
      expect(validReport(bad)).toBe(false);
      expect(checkReportFile(bad).ok).toBe(false);
    }
  });
  it("the gate also catches personal data hidden in allowed text fields", () => {
    const r = report(measure(PAGE));
    r.notes.push("Ask jane.doe@example.com or call +39 333 123 4567");
    const res = checkReportFile(r);
    expect(res.ok).toBe(false);
    expect(res.problems.join(" ")).toMatch(/e-mail|phone/);
  });
});

describe("page content never reaches an exported file (canary test)", () => {
  const CANARIES = [
    "CANARY-title-ZQX",
    "CANARY-text-ZQX",
    "CANARY-class-zqx",
    "CANARY-id-zqx",
    "CANARY-alt-ZQX",
    "CANARY-href-zqx",
    "CANARY-name-zqx",
    "secret-token-zqx",
  ];
  const page = `<head><title>${CANARIES[0]}</title><meta name="description" content="${CANARIES[1]}"></head><body id="${CANARIES[3]}" class="${CANARIES[2]}">
    <header><nav><a href="/${CANARIES[5]}?token=${CANARIES[7]}">${CANARIES[1]}</a><a href="/a">A</a><a href="/b">B</a></nav></header>
    <main><img alt="${CANARIES[4]}" src="/x.png"><form><input name="${CANARIES[6]}" value="${CANARIES[7]}"></form><p>${CANARIES[1]} ${CANARIES[1]}</p></main></body>`;
  it("neither the measurement file nor the report contains any of it", () => {
    const m = measure(page);
    const a = prepareMeasurementExport(m);
    const b = prepareReportExport(report(m));
    expect(a.ok && b.ok).toBe(true);
    for (const c of CANARIES) {
      expect(a.json, c).not.toContain(c);
      expect(b.json, c).not.toContain(c);
    }
  });
  it("a hostile page language or title cannot smuggle text through allowed fields", () => {
    document.documentElement.innerHTML = `<head></head><body>x</body>`;
    document.documentElement.lang = "en-jane.doe@example.com";
    const m = measurePage(document);
    m.page.host = "example.com";
    expect(m.page.lang).toBe("");
    expect(prepareMeasurementExport(m).ok).toBe(true);
  });
});

describe("export: you see exactly what is saved, and only when you say so", () => {
  // The box is built when needed, after the page under test was measured (measuring replaces the document).
  const els = () => {
    document.body.innerHTML = `<section id="box" hidden><dl id="s"></dl><div id="p"></div><pre id="j"></pre><button id="save"></button><button id="cancel"></button></section>`;
    return {
      box: document.getElementById("box")!,
      summary: document.getElementById("s")!,
      problems: document.getElementById("p")!,
      json: document.getElementById("j")!,
      save: document.getElementById("save") as HTMLButtonElement,
      cancel: document.getElementById("cancel") as HTMLButtonElement,
    };
  };
  it("shows the full text and a plain summary, and writes nothing until Save", () => {
    const preview = prepareMeasurementExport(measure(PAGE));
    const save = vi.fn();
    const e = els();
    showPreview(e, preview, save);
    expect(e.box.hidden).toBe(false);
    expect(e.json.textContent).toBe(preview.json);
    expect(e.summary.textContent).toContain("example.com");
    expect(e.summary.textContent).toContain("No");
    expect(save).not.toHaveBeenCalled();
    e.save.click();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(preview.fileName, preview.json); // the very text that was shown
    expect(e.box.hidden).toBe(true);
  });
  it("Cancel saves nothing", () => {
    const save = vi.fn();
    const e = els();
    showPreview(e, prepareMeasurementExport(measure(PAGE)), save);
    e.cancel.click();
    expect(save).not.toHaveBeenCalled();
    expect(e.box.hidden).toBe(true);
  });
  it("a file that fails the gate cannot be saved, and the reason is shown", () => {
    const m = measure(PAGE);
    m.page.host = ""; // a private or local address
    const preview = prepareMeasurementExport(m);
    expect(preview.ok).toBe(false);
    const save = vi.fn();
    const e = els();
    showPreview(e, preview, save);
    expect(e.save.disabled).toBe(true);
    expect(e.problems.textContent).toContain("private");
    e.save.click();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("personal data scanner and observation sheets", () => {
  it("flags e-mail, phone-like numbers, IPs, query links and secret-looking tokens, not dates or ids", () => {
    for (const bad of [
      "mail me: a.b@c.org",
      "call +39 333 123 4567",
      "ip 192.168.1.20",
      "see https://x.test/a?id=5",
      "key abcdefghijklmnopqrstuvwxyz0123456789",
      "card 4111 1111 1111 1111",
    ])
      expect(scanForPersonalData(bad).length, bad).toBeGreaterThan(0);
    for (const ok of [
      "observed on 2026-11-10 at 1280 px",
      "visual.china.vivid-palette",
      "Chrome 130.0.6723.58",
      "five of 12 sites",
    ])
      expect(scanForPersonalData(ok), ok).toEqual([]);
  });
  it("an observation sheet with an e-mail in a note is refused", () => {
    const sheet = load("research/observations/template.json");
    Object.assign(sheet, {
      platform: "x",
      observedOn: "2026-11-10",
      observer: "AB",
      browser: "Chrome 130",
      limits: "logged out only",
    });
    expect(validateObservation(sheet).filter((p) => /contains/.test(p))).toEqual([]);
    sheet.limits = "contact me at jane@doe.org";
    expect(validateObservation(sheet).join()).toContain("e-mail");
  });
});

describe("everything committed under research/ passes the gates", () => {
  const files = (d: string): string[] =>
    !existsSync(d)
      ? []
      : readdirSync(d).flatMap((f) =>
          statSync(join(d, f)).isDirectory()
            ? files(join(d, f))
            : f.endsWith(".json")
              ? [join(d, f)]
              : [],
        );
  it("measurements", () => {
    for (const f of files("research/measurements"))
      expect(checkMeasurementFile(load(f)).problems, f).toEqual([]);
  });
  it("observations (the template is a template)", () => {
    for (const f of files("research/observations").filter((x) => !x.endsWith("template.json")))
      expect(validateObservation(load(f)), f).toEqual([]);
  });
  it("adapter verification sheets contain no personal data", () => {
    for (const f of files("research/adapter-verification").filter(
      (x) => !x.endsWith("template.json"),
    ))
      expect(scanForPersonalData(JSON.stringify(load(f))), f).toEqual([]);
  });
});
