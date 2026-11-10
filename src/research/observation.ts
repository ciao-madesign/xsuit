// Observation sheets: structured notes for platforms the extension cannot measure (login walls,
// app-first services). They are evidence under decision #9, so the format is checked.

export const OBSERVATION_SCHEMA = "xsuit.observation/1";
export const CONVENTIONS = [
  "density",
  "hierarchy",
  "central-feed",
  "navigation",
  "media-and-colour",
  "promotions",
  "social-interaction",
  "super-app-features",
] as const;
const STATUS = ["present", "absent", "not-observed"];
const LOGIN = ["logged-out", "logged-in"];
const METRIC_SOURCE = ["not-measured", "xsuit-measurement", "manual"];
const PAGE_TYPES = [
  "home",
  "search-results",
  "product-list",
  "product-detail",
  "article",
  "feed",
  "video",
  "other",
];

/** Returns a list of problems; empty means the sheet is valid. Template placeholders are rejected. */
export function validateObservation(input: unknown): string[] {
  const out: string[] = [];
  if (typeof input !== "object" || input === null) return ["sheet must be an object"];
  const s = input as Record<string, unknown>;
  const str = (k: string) => typeof s[k] === "string" && (s[k] as string).trim() !== "";
  if (s.schema !== OBSERVATION_SCHEMA) out.push(`schema must be "${OBSERVATION_SCHEMA}"`);
  if (!str("platform")) out.push("platform is required");
  if (!PAGE_TYPES.includes(s.pageType as string)) out.push("pageType is not valid");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.observedOn))) out.push("observedOn must be YYYY-MM-DD");
  if (!str("observer")) out.push("observer is required");
  if (!str("browser")) out.push("browser is required");
  if (typeof s.viewportWidth !== "number" || s.viewportWidth < 300)
    out.push("viewportWidth must be a number");
  if (!LOGIN.includes(s.login as string)) out.push("login must be logged-out or logged-in");
  const m = s.metrics as Record<string, unknown> | undefined;
  if (!m || !METRIC_SOURCE.includes(m.source as string)) out.push("metrics.source is not valid");
  const c = s.conventions as Record<string, { status?: unknown; note?: unknown }> | undefined;
  for (const k of CONVENTIONS) {
    const e = c?.[k];
    if (!e || !STATUS.includes(e.status as string))
      out.push(`conventions.${k}.status is not valid`);
    else if (e.status !== "not-observed" && (typeof e.note !== "string" || e.note.trim() === ""))
      out.push(`conventions.${k} needs a note when observed`);
  }
  if (!Array.isArray(s.screenshots)) out.push("screenshots must be an array");
  if (!str("limits")) out.push("limits is required (what this observation cannot show)");
  return out;
}
