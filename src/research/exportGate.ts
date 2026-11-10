// The only way a research file leaves xsuit. Nothing is written to disk before the person has
// seen exactly this text. The same JSON that is previewed is the JSON that is saved.

import { measurementFileName, type Measurement } from "../metrics/metrics";
import { reportFileName, type Report } from "../report/report";
import { checkMeasurementFile, checkReportFile } from "./privacy";

export interface ExportPreview {
  ok: boolean;
  /** Why the file cannot be exported (empty when ok). */
  problems: string[];
  fileName: string;
  /** Exactly what will be written to the file. */
  json: string;
  /** Plain-language list of what the file contains. */
  summary: { label: string; value: string }[];
}

const size = (s: string) => `${(s.length / 1024).toFixed(1)} KB`;

function blocked(problems: string[]): ExportPreview {
  return { ok: false, problems, fileName: "", json: "", summary: [] };
}

export function prepareMeasurementExport(m: Measurement): ExportPreview {
  const check = checkMeasurementFile(m);
  if (!check.ok)
    return blocked(
      m.page.host === ""
        ? ["This site name is a private, local or unusual address, so no file is made."]
        : check.problems,
    );
  const json = JSON.stringify(m, null, 2);
  return {
    ok: true,
    problems: [],
    fileName: measurementFileName(m),
    json,
    summary: [
      { label: "Site name", value: m.page.host },
      { label: "Page type", value: m.page.pageType },
      { label: "Page language", value: m.page.lang || "not set" },
      { label: "Window size", value: `${m.viewport.width} × ${m.viewport.height} px` },
      { label: "Numbers measured", value: String(Object.keys(m.metrics).length) },
      { label: "Contains page text, links, address path or personal data", value: "No" },
      { label: "File size", value: size(json) },
    ],
  };
}

export function prepareReportExport(r: Report): ExportPreview {
  const check = checkReportFile(r);
  if (!check.ok) return blocked(check.problems);
  const json = JSON.stringify(r, null, 2);
  return {
    ok: true,
    problems: [],
    fileName: reportFileName(r),
    json,
    summary: [
      { label: "Site name", value: r.page.host },
      { label: "Page type", value: r.page.pageType },
      { label: "Style", value: `${r.profile} (${r.depth})` },
      { label: "Rules listed", value: String(r.rules.length) },
      { label: "Numbers compared", value: String(r.metrics.length) },
      { label: "Screenshots included", value: "No (they stay on this device)" },
      { label: "Contains page text, links, address path or personal data", value: "No" },
      { label: "File size", value: size(json) },
    ],
  };
}
