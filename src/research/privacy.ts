import { scanValue } from "./personal";

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

  for (const w of scanValue(raw.definitions, "definitions")) problems.push(w);
  const cleaned = problems.length ? null : { ...raw, schema: "xsuit.metrics/2", page };
  return { ok: problems.length === 0, problems, cleaned };
}

// ---- comparison report (xsuit.report/3) ------------------------------------------------------

const REPORT_TOP = [
  "schema",
  "createdAt",
  "page",
  "profile",
  "depth",
  "pageType",
  "transformed",
  "rules",
  "undoneByGuard",
  "skipped",
  "metrics",
  "scorecard",
  "notes",
];
const RULE_ID_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const NAME_RE = /^[a-z][a-z0-9-]{0,40}$/;
const MAX_TEXT = 300;
const MAX_ITEMS = 200;

const keysOk = (o: Record<string, unknown>, allowed: string[], path: string, p: string[]) => {
  for (const k of Object.keys(o))
    if (!allowed.includes(k)) p.push(`${path}: field not allowed: ${k}`);
};
const text = (v: unknown, path: string, p: string[]) => {
  if (typeof v !== "string" || v.length > MAX_TEXT)
    p.push(`${path}: must be text of at most ${MAX_TEXT} characters`);
};
const num = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));

export function checkReportFile(raw: unknown): MeasurementCheck {
  const p: string[] = [];
  if (!isObj(raw)) return { ok: false, problems: ["not an object"], cleaned: null };
  if (raw.schema !== "xsuit.report/3")
    return { ok: false, problems: ["unknown schema"], cleaned: null };
  keysOk(raw, REPORT_TOP, "report", p);
  if (typeof raw.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(raw.createdAt))
    p.push("createdAt must be a UTC time");
  if (!isObj(raw.page)) p.push("page missing");
  else {
    keysOk(raw.page, ["host", "pageType"], "page", p);
    if (typeof raw.page.host !== "string" || !HOST_RE.test(raw.page.host))
      p.push("page.host invalid");
    if (typeof raw.page.pageType !== "string" || !TYPE_RE.test(raw.page.pageType))
      p.push("page.pageType invalid");
  }
  for (const k of ["profile", "depth", "pageType"] as const)
    if (typeof raw[k] !== "string" || !NAME_RE.test(raw[k] as string)) p.push(`${k} invalid`);
  if (typeof raw.transformed !== "boolean") p.push("transformed must be true or false");
  const list = (k: string) =>
    Array.isArray(raw[k]) && (raw[k] as unknown[]).length <= MAX_ITEMS
      ? (raw[k] as unknown[])
      : (p.push(`${k} must be a list of at most ${MAX_ITEMS}`), []);
  list("rules").forEach((r, i) => {
    if (!isObj(r)) return p.push(`rules[${i}] invalid`);
    keysOk(
      r,
      [
        "id",
        "title",
        "version",
        "dimension",
        "pole",
        "evidence",
        "sources",
        "confidence",
        "elements",
      ],
      `rules[${i}]`,
      p,
    );
    if (typeof r.id !== "string" || !RULE_ID_RE.test(r.id)) p.push(`rules[${i}].id invalid`);
    if (typeof r.version !== "string" || !/^\d+\.\d+\.\d+$/.test(r.version))
      p.push(`rules[${i}].version invalid`);
    for (const k of ["dimension", "pole"])
      if (typeof r[k] !== "string" || !NAME_RE.test(r[k] as string))
        p.push(`rules[${i}].${k} invalid`);
    if (
      !Array.isArray(r.sources) ||
      r.sources.length > 20 ||
      r.sources.some((s) => typeof s !== "string" || !/^[a-z0-9-]{1,40}$/.test(s))
    )
      p.push(`rules[${i}].sources must be source ids`);
    if (!["low", "medium", "high", "n/a"].includes(r.confidence as string))
      p.push(`rules[${i}].confidence invalid`);
    text(r.title, `rules[${i}].title`, p);
    if (typeof r.evidence !== "string" || !NAME_RE.test(r.evidence))
      p.push(`rules[${i}].evidence invalid`);
    if (!Number.isInteger(r.elements) || (r.elements as number) < 0)
      p.push(`rules[${i}].elements invalid`);
  });
  for (const k of ["undoneByGuard", "skipped"])
    list(k).forEach((r, i) => {
      if (!isObj(r)) return p.push(`${k}[${i}] invalid`);
      keysOk(r, ["ruleId", "reason"], `${k}[${i}]`, p);
      if (typeof r.ruleId !== "string" || !RULE_ID_RE.test(r.ruleId))
        p.push(`${k}[${i}].ruleId invalid`);
      text(r.reason, `${k}[${i}].reason`, p);
    });
  list("metrics").forEach((r, i) => {
    if (!isObj(r)) return p.push(`metrics[${i}] invalid`);
    keysOk(r, ["metric", "before", "after", "delta"], `metrics[${i}]`, p);
    if (typeof r.metric !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(r.metric))
      p.push(`metrics[${i}].metric invalid`);
    for (const k of ["before", "after", "delta"])
      if (!num(r[k])) p.push(`metrics[${i}].${k} is not a number`);
  });
  list("notes").forEach((n, i) => text(n, `notes[${i}]`, p));
  checkScorecard(raw.scorecard, p);
  // Whatever the structure, nothing in the strings may look like personal data.
  for (const w of scanValue(raw)) p.push(w);
  return { ok: p.length === 0, problems: p, cleaned: p.length ? null : raw };
}

const NEAREST = ["western", "china", "in-between", null];
function checkScorecard(sc: unknown, p: string[]): void {
  if (!isObj(sc)) return void p.push("scorecard missing");
  keysOk(sc, ["disclaimer", "rows"], "scorecard", p);
  text(sc.disclaimer, "scorecard.disclaimer", p);
  if (!Array.isArray(sc.rows) || sc.rows.length > 50) return void p.push("scorecard.rows invalid");
  sc.rows.forEach((r, i) => {
    const at = `scorecard.rows[${i}]`;
    if (!isObj(r)) return void p.push(`${at} invalid`);
    keysOk(
      r,
      [
        "dimension",
        "name",
        "family",
        "measured",
        "reference",
        "position",
        "nearest",
        "poles",
        "note",
      ],
      at,
      p,
    );
    for (const k of ["dimension", "family"])
      if (typeof r[k] !== "string" || !NAME_RE.test(r[k] as string)) p.push(`${at}.${k} invalid`);
    text(r.name, `${at}.name`, p);
    text(r.note, `${at}.note`, p);
    if (!Array.isArray(r.measured) || r.measured.length > 20) p.push(`${at}.measured invalid`);
    else
      r.measured.forEach((m, k) => {
        if (!isObj(m)) return void p.push(`${at}.measured[${k}] invalid`);
        keysOk(m, ["metric", "before", "after"], `${at}.measured[${k}]`, p);
        if (typeof m.metric !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(m.metric))
          p.push(`${at}.measured[${k}].metric invalid`);
        for (const f of ["before", "after"])
          if (!num(m[f])) p.push(`${at}.measured[${k}].${f} is not a number`);
      });
    if (r.reference !== null) {
      if (!isObj(r.reference)) p.push(`${at}.reference invalid`);
      else {
        keysOk(
          r.reference,
          ["metric", "west", "china", "source", "provisional"],
          `${at}.reference`,
          p,
        );
        if (
          typeof r.reference.metric !== "string" ||
          !/^[A-Za-z0-9]{1,40}$/.test(r.reference.metric)
        )
          p.push(`${at}.reference.metric invalid`);
        if (typeof r.reference.west !== "number" || typeof r.reference.china !== "number")
          p.push(`${at}.reference values invalid`);
        if (typeof r.reference.source !== "string" || !/^[a-z0-9-]{1,40}$/.test(r.reference.source))
          p.push(`${at}.reference.source invalid`);
        if (r.reference.provisional !== true) p.push(`${at}.reference must be marked provisional`);
      }
    }
    for (const k of ["position", "nearest"] as const) {
      const v = r[k];
      if (v === null) continue;
      if (!isObj(v)) {
        p.push(`${at}.${k} invalid`);
        continue;
      }
      keysOk(v, ["before", "after"], `${at}.${k}`, p);
      for (const f of ["before", "after"])
        if (k === "position" ? !num(v[f]) : !NEAREST.includes(v[f] as never))
          p.push(`${at}.${k}.${f} invalid`);
    }
    if (!isObj(r.poles)) p.push(`${at}.poles invalid`);
    else {
      keysOk(r.poles, ["western", "china"], `${at}.poles`, p);
      for (const f of ["western", "china"]) {
        const v = (r.poles as Record<string, unknown>)[f];
        if (v !== null && (typeof v !== "string" || !NAME_RE.test(v)))
          p.push(`${at}.poles.${f} invalid`);
      }
    }
  });
}
