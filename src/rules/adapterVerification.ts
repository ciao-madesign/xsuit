// An adapter may be marked "tested" only with a verification sheet filled by a person on the
// real site (adapters/VERIFY.md). This checks that the sheet really covers the adapter.

import type { Adapter } from "./types";

export const VERIFICATION_SCHEMA = "xsuit.adapter-verification/1";

export interface VerificationSheet {
  schema: typeof VERIFICATION_SCHEMA;
  adapter: string;
  checkedOn: string;
  browser: string;
  observer: string;
  loggedIn: boolean;
  pageTypes: string[];
  components: {
    component: string;
    selectors: { selector: string; found: number; confirmed: boolean; note?: string }[];
  }[];
  pageTypeHints: { pageType: string; urlPattern: string; samplePath: string; matches: boolean }[];
  notes?: string;
}

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PATH_RE = /^\/[A-Za-z0-9._~\-/]*$/; // path only: no query, no fragment, no personal data

/** Returns the list of problems; empty means the sheet supports "tested". */
export function checkVerification(adapter: Adapter, raw: unknown): string[] {
  const p: string[] = [];
  if (!isObj(raw)) return ["sheet is not an object"];
  const s = raw as Partial<VerificationSheet> & Record<string, unknown>;
  if (s.schema !== VERIFICATION_SCHEMA) p.push("wrong schema");
  if (s.adapter !== adapter.id) p.push(`sheet is for ${String(s.adapter)}, not ${adapter.id}`);
  if (typeof s.checkedOn !== "string" || !DATE_RE.test(s.checkedOn))
    p.push("checkedOn must be YYYY-MM-DD");
  for (const k of ["browser", "observer"] as const)
    if (typeof s[k] !== "string" || !(s[k] as string).trim()) p.push(`${k} is missing`);
  if (!Array.isArray(s.pageTypes) || s.pageTypes.length === 0) p.push("pageTypes is missing");

  const v = adapter.verification;
  if (!v) p.push("adapter has no verification record");
  else {
    if (v.checkedOn !== s.checkedOn) p.push("checkedOn differs from the adapter's record");
    if (v.browser !== s.browser) p.push("browser differs from the adapter's record");
    if (JSON.stringify([...v.pageTypes].sort()) !== JSON.stringify([...(s.pageTypes ?? [])].sort()))
      p.push("page types differ from the adapter's record");
    if (v.sheet !== `${adapter.id}.json`) p.push(`sheet must be named ${adapter.id}.json`);
  }

  const comps = Array.isArray(s.components) ? s.components : [];
  for (const entry of adapter.components) {
    const found = comps.find((c) => c.component === entry.component);
    if (!found) {
      p.push(`component ${entry.component} was not checked`);
      continue;
    }
    for (const sel of entry.selectors) {
      const row = found.selectors?.find((x) => x.selector === sel);
      if (!row) p.push(`${entry.component}: selector not checked: ${sel}`);
      else if (!(row.found >= 1) || row.confirmed !== true)
        p.push(`${entry.component}: selector not confirmed (remove or fix it): ${sel}`);
    }
    for (const row of found.selectors ?? [])
      if (!entry.selectors.includes(row.selector))
        p.push(
          `${entry.component}: sheet lists a selector the adapter does not have: ${row.selector}`,
        );
  }
  const hints = Array.isArray(s.pageTypeHints) ? s.pageTypeHints : [];
  for (const h of adapter.pageTypeHints) {
    const row = hints.find((x) => x.pageType === h.pageType && x.urlPattern === h.urlPattern);
    if (!row) p.push(`page type hint not checked: ${h.pageType} ${h.urlPattern}`);
    else {
      if (row.matches !== true) p.push(`page type hint does not match its sample: ${h.urlPattern}`);
      if (typeof row.samplePath !== "string" || !PATH_RE.test(row.samplePath))
        p.push(`samplePath must be a plain path without query: ${h.urlPattern}`);
    }
  }
  return p;
}
