// What the popup shows, decided by pure functions (tested without a browser).

import type { ProfileChoice, Settings } from "../shared/settings";

export type Market = "western" | "china";
export const MARKETS: { id: Market; name: string; blurb: string }[] = [
  {
    id: "western",
    name: "Western",
    blurb: "Calm pages: more space, one clear focus, search first.",
  },
  {
    id: "china",
    name: "China",
    blurb: "Rich pages: denser, more images and promotions, discovery feed.",
  },
];

/** Only a suggestion shown on the first-run screen. The person always chooses. */
export function suggestMarket(language: string | undefined): Market | null {
  const l = (language ?? "").toLowerCase();
  if (l.startsWith("zh")) return "china";
  return l ? "western" : null;
}

export function marketName(profile: ProfileChoice): string {
  if (profile === "hybrid") return "Custom mix";
  return MARKETS.find((m) => m.id === profile)?.name ?? "None chosen";
}

export type View =
  | { kind: "onboarding" }
  | { kind: "unsupported"; message: string }
  | { kind: "home"; toggle: { label: string; disabled: boolean }; hint: string };

export interface ViewInput {
  settings: Settings;
  /** null when the page cannot be adapted (browser page, store, ...). */
  supported: boolean;
  unsupportedReason?: string;
  adapted: boolean;
}

export function viewFor(i: ViewInput): View {
  if (!i.settings.onboarded || i.settings.profile === "original") return { kind: "onboarding" };
  if (!i.supported)
    return {
      kind: "unsupported",
      message: i.unsupportedReason ?? "xsuit cannot change this page.",
    };
  if (!i.settings.enabled)
    return {
      kind: "home",
      toggle: { label: "Adapt this page", disabled: true },
      hint: "xsuit is turned off. Turn it on under Advanced.",
    };
  return i.adapted
    ? {
        kind: "home",
        toggle: { label: "Back to original", disabled: false },
        hint: `This page is adapted to the ${marketName(i.settings.profile)} style.`,
      }
    : {
        kind: "home",
        toggle: { label: "Adapt this page", disabled: false },
        hint: `One click: this page takes the ${marketName(i.settings.profile)} style.`,
      };
}

/** Plain-words result of pressing "Adapt this page". */
export function adaptResult(applied: boolean, rules: number): string {
  return applied
    ? `Done: ${rules} change${rules === 1 ? "" : "s"}. The label on the page tells you what changed.`
    : "Nothing needed changing on this page.";
}
