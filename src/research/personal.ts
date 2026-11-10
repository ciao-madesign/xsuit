// Looks for things that must never travel in a research file: e-mail addresses, phone-like and
// long numbers, links with a query string or credentials, IP addresses, secret-looking tokens.
// It cannot find a name written in plain words: observers must use initials or a pseudonym
// (docs/19-privacy-and-data-governance.md). It is a safety net, not a guarantee.

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/, "an e-mail address"],
  [
    /https?:\/\/[^\s]*[?#]|https?:\/\/[^\s/@]*@/i,
    "a link with a query string, fragment or credentials",
  ],
  [/\b\d{1,3}(\.\d{1,3}){3}\b/, "an IP address"],
  [/\b[A-Za-z0-9_-]{28,}\b/, "a long token or identifier"],
];

/** Returns what was found (empty = nothing suspicious). */
export function scanForPersonalData(text: string): string[] {
  const found: string[] = [];
  for (const [re, label] of PATTERNS) if (re.test(text)) found.push(label);
  // Phone numbers and other long numbers: nine or more digits in one run (dates are fine).
  for (const run of text.match(/\+?\d[\d\s().-]{6,}\d/g) ?? [])
    // Dates and version numbers (130.0.6723.58) are fine; a dotted IP is caught by its own pattern.
    if (
      run.replace(/\D/g, "").length >= 9 &&
      !/^\d{4}-\d{2}-\d{2}/.test(run) &&
      !/^\d+(\.\d+){3,}$/.test(run.trim())
    ) {
      found.push("a phone-like or long number");
      break;
    }
  return found;
}

/** Walks every string in a value and reports where something suspicious sits. */
export function scanValue(value: unknown, path = "$"): string[] {
  if (typeof value === "string")
    return scanForPersonalData(value).map((w) => `${path}: contains ${w}`);
  if (Array.isArray(value)) return value.flatMap((v, i) => scanValue(v, `${path}[${i}]`));
  if (typeof value === "object" && value !== null)
    return Object.entries(value).flatMap(([k, v]) => scanValue(v, `${path}.${k}`));
  return [];
}
