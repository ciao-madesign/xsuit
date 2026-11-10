import { PROFILE_IDS } from "../rules/vocab";

export const PROFILE_CHOICES = ["original", ...PROFILE_IDS] as const;
export type ProfileChoice = (typeof PROFILE_CHOICES)[number];
export const DEPTHS = ["visual", "structural"] as const;
export type Depth = (typeof DEPTHS)[number];

export const LABEL_POSITIONS = ["bottom-left", "bottom-right", "hidden"] as const;
export type LabelPosition = (typeof LABEL_POSITIONS)[number];

export interface Settings {
  /** The person has chosen a market once (first-run screen done). */
  onboarded: boolean;
  enabled: boolean;
  profile: ProfileChoice;
  depth: Depth;
  /** Sites where xsuit runs automatically. Everywhere else it runs only on request. */
  enabledSites: string[];
  /** Rules the user turned off (all sites). */
  disabledRules: string[];
  labelPosition: LabelPosition;
  /** Hybrid composition chosen by the user: one pole per dimension; null = the default. */
  hybridChoices: Record<string, string> | null;
  /** Legacy (before dimensions): Hybrid rules picked one by one. Used only when no choices exist. */
  hybridRules: string[] | null;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  enabled: true,
  profile: "original",
  depth: "visual",
  enabledSites: [],
  disabledRules: [],
  labelPosition: "bottom-left",
  hybridChoices: null,
  hybridRules: null,
};

const RULE_ID_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const MAX_LIST = 500;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
/** Too broad to grant: one site entry would cover unrelated organizations. */
const SHARED_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "co.jp",
  "or.jp",
  "ne.jp",
  "co.kr",
  "or.kr",
  "com.cn",
  "net.cn",
  "org.cn",
  "gov.cn",
  "edu.cn",
  "com.hk",
  "com.tw",
  "com.sg",
  "com.br",
  "com.mx",
  "com.ar",
  "co.in",
  "co.za",
  "com.tr",
  "github.io",
  "gitlab.io",
  "pages.dev",
  "netlify.app",
  "vercel.app",
  "herokuapp.com",
  "blogspot.com",
  "appspot.com",
  "web.app",
  "firebaseapp.com",
  "azurewebsites.net",
  "cloudfront.net",
  "amazonaws.com",
]);

/** Accepts "https://www.Example.com/x", "WWW.example.com", "example.com". Returns null if not a host. */
export function normalizeHost(input: string): string | null {
  let h = input.trim().toLowerCase();
  if (!h) return null;
  if (h.includes("://")) {
    try {
      h = new URL(h).hostname;
    } catch {
      return null;
    }
  }
  h = h.replace(/^www\./, "").replace(/\.$/, "");
  if (h.length > 253 || IPV4_RE.test(h) || SHARED_SUFFIXES.has(h)) return null;
  const tld = h.slice(h.lastIndexOf(".") + 1);
  if (tld.length < 2 || /^\d+$/.test(tld)) return null;
  return HOST_RE.test(h) ? h : null;
}

/** Makes any stored value safe: unknown or corrupted data falls back to defaults. */
export function normalizeSettings(raw: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, enabledSites: [], disabledRules: [] };
  if (typeof raw !== "object" || raw === null) return s;
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled === "boolean") s.enabled = r.enabled;
  if (typeof r.onboarded === "boolean") s.onboarded = r.onboarded;
  if (PROFILE_CHOICES.includes(r.profile as ProfileChoice)) s.profile = r.profile as ProfileChoice;
  // Settings saved before the first-run screen existed: a chosen style means it was done.
  if (typeof r.onboarded !== "boolean" && s.profile !== "original") s.onboarded = true;
  if (DEPTHS.includes(r.depth as Depth)) s.depth = r.depth as Depth;
  if (LABEL_POSITIONS.includes(r.labelPosition as LabelPosition))
    s.labelPosition = r.labelPosition as LabelPosition;
  if (Array.isArray(r.disabledRules)) {
    s.disabledRules = [
      ...new Set(
        r.disabledRules
          .slice(0, MAX_LIST)
          .filter((x): x is string => typeof x === "string" && RULE_ID_RE.test(x)),
      ),
    ].sort();
  }
  if (
    typeof r.hybridChoices === "object" &&
    r.hybridChoices !== null &&
    !Array.isArray(r.hybridChoices)
  ) {
    // Shape only here (ids made of lowercase letters, digits, hyphens); the dimensions list itself
    // is applied where it is known, so this small module stays free of the rules data.
    const choices: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.hybridChoices).slice(0, 50))
      if (
        typeof v === "string" &&
        /^[a-z][a-z0-9-]{0,40}$/.test(k) &&
        /^[a-z][a-z0-9-]{0,40}$/.test(v)
      )
        choices[k] = v;
    s.hybridChoices = choices;
  }
  if (Array.isArray(r.hybridRules)) {
    s.hybridRules = [
      ...new Set(
        r.hybridRules
          .slice(0, MAX_LIST)
          .filter((x): x is string => typeof x === "string" && RULE_ID_RE.test(x)),
      ),
    ].sort();
  }
  if (Array.isArray(r.enabledSites)) {
    const set = new Set<string>();
    for (const d of r.enabledSites.slice(0, MAX_LIST)) {
      const h = typeof d === "string" ? normalizeHost(d) : null;
      if (h) set.add(h);
    }
    s.enabledSites = [...set].sort();
  }
  return s;
}

export function isSiteEnabled(settings: Settings, host: string): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  return settings.enabledSites.some((d) => h === d || h.endsWith(`.${d}`));
}

export function withSite(settings: Settings, host: string, enabled: boolean): Settings {
  const h = normalizeHost(host);
  if (!h) return settings;
  const rest = settings.enabledSites.filter((d) => d !== h);
  return { ...settings, enabledSites: enabled ? [...rest, h].sort() : rest };
}

/** Match patterns (https only) for a site and its subdomains. Empty for an invalid or too broad host. */
export function sitePatterns(host: string): string[] {
  const h = normalizeHost(host);
  return h ? [`https://${h}/*`, `https://*.${h}/*`] : [];
}
