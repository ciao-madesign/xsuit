// Privacy gate for research files. A measurement file may contain ONLY the fields below.
// Anything else (a URL path, page text, an unknown field) makes the file unusable, so personal
// data cannot slip into shared evidence by accident.

const TOP = [
  "schema",
  "capturedAt",
  "page",
  "viewport",
  "hasLayout",
  "sampledElements",
  "metrics",
  "definitions",
];
const PAGE = ["host", "pageType", "lang"];
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const TYPE_RE = /^[a-z][a-z0-9-]{0,30}$/;
const LANG_RE = /^([a-z]{2,3}(-[a-z0-9]{2,8})?)?$/;
const MAX_DEFINITION = 200;

export interface MeasurementCheck {
  ok: boolean;
  problems: string[];
  /** The file with legacy fields (URL path) removed; only meaningful for known older schemas. */
  cleaned: Record<string, unknown> | null;
}

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

export function checkMeasurementFile(raw: unknown): MeasurementCheck {
  const problems: string[] = [];
  if (!isObj(raw)) return { ok: false, problems: ["not an object"], cleaned: null };
  const legacy = raw.schema === "xsuit.metrics/1";
  if (raw.schema !== "xsuit.metrics/2" && !legacy)
    return { ok: false, problems: ["unknown schema"], cleaned: null };

  const page = isObj(raw.page) ? { ...raw.page } : null;
  if (!page) return { ok: false, problems: ["page missing"], cleaned: null };
  if (legacy) {
    // Older files carried the URL path: drop it, never trust it, and mark the type as unknown.
    delete page.path;
    page.pageType = "unknown";
  }
  for (const k of Object.keys(raw)) if (!TOP.includes(k)) problems.push(`field not allowed: ${k}`);
  for (const k of Object.keys(page))
    if (!PAGE.includes(k)) problems.push(`page field not allowed: ${k}`);
  if (typeof page.host !== "string" || !HOST_RE.test(page.host)) problems.push("page.host invalid");
  if (typeof page.pageType !== "string" || !TYPE_RE.test(page.pageType))
    problems.push("page.pageType invalid");
  if (typeof page.lang !== "string" || !LANG_RE.test(page.lang)) problems.push("page.lang invalid");

  const metrics = raw.metrics;
  if (!isObj(metrics)) problems.push("metrics missing");
  else
    for (const [k, v] of Object.entries(metrics))
      if (!(v === null || (typeof v === "number" && Number.isFinite(v))))
        problems.push(`metric ${k} is not a number`);
  if (isObj(raw.definitions))
    for (const [k, v] of Object.entries(raw.definitions))
      if (typeof v !== "string" || v.length > MAX_DEFINITION)
        problems.push(`definition ${k} invalid`);

  const cleaned = problems.length ? null : { ...raw, schema: "xsuit.metrics/2", page };
  return { ok: problems.length === 0, problems, cleaned };
}
