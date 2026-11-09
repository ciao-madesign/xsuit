import { PROFILE_IDS } from "../rules/vocab";

export const PROFILE_CHOICES = ["original", ...PROFILE_IDS] as const;
export type ProfileChoice = (typeof PROFILE_CHOICES)[number];
export const DEPTHS = ["visual", "structural"] as const;
export type Depth = (typeof DEPTHS)[number];

export interface Settings {
  enabled: boolean;
  profile: ProfileChoice;
  depth: Depth;
  excludedDomains: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  profile: "original",
  depth: "visual",
  excludedDomains: [],
};

const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

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
  return HOST_RE.test(h) ? h : null;
}

/** Makes any stored value safe: unknown or corrupted data falls back to defaults. */
export function normalizeSettings(raw: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, excludedDomains: [] };
  if (typeof raw !== "object" || raw === null) return s;
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled === "boolean") s.enabled = r.enabled;
  if (PROFILE_CHOICES.includes(r.profile as ProfileChoice)) s.profile = r.profile as ProfileChoice;
  if (DEPTHS.includes(r.depth as Depth)) s.depth = r.depth as Depth;
  if (Array.isArray(r.excludedDomains)) {
    const set = new Set<string>();
    for (const d of r.excludedDomains) {
      const h = typeof d === "string" ? normalizeHost(d) : null;
      if (h) set.add(h);
    }
    s.excludedDomains = [...set].sort();
  }
  return s;
}

export function isExcluded(settings: Settings, host: string): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  return settings.excludedDomains.some((d) => h === d || h.endsWith(`.${d}`));
}

export function withExclusion(settings: Settings, host: string, excluded: boolean): Settings {
  const h = normalizeHost(host);
  if (!h) return settings;
  const rest = settings.excludedDomains.filter((d) => d !== h);
  return { ...settings, excludedDomains: excluded ? [...rest, h].sort() : rest };
}
