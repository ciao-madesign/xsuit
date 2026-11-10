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

export interface AdaptOutcome {
  applied: boolean;
  rules: number;
  skipped: { ruleId: string; reason: string }[];
  recognized: { component: string }[];
  reverted: { ruleId: string; reason: string }[];
  intensity: Settings["intensity"];
  market: string;
}

const has = (o: AdaptOutcome, re: RegExp) => o.skipped.some((s) => re.test(s.reason));

/**
 * Plain-words result of pressing "Adapt this page". When nothing (or little) changed it says why,
 * so a person is never left guessing whether xsuit worked.
 */
export function adaptMessage(o: AdaptOutcome): string {
  if (!o.applied) {
    if (o.reverted.length)
      return "xsuit undid its changes because they would have made this page harder to read or use.";
    if (has(o, /asks for a password or payment/))
      return "This page asks for a password or payment details, so xsuit leaves it alone.";
    if (has(o, /phone-sized viewport/))
      return "This window is phone-sized. xsuit's measured styles only run on desktop-width pages: widen the window.";
    if (has(o, /already at or (below|above) the target/))
      return `This page is already close to the ${o.market} style.`;
    if (!o.recognized.length)
      return "xsuit could not recognise the parts of this page, so it left it alone.";
    return "Nothing needed changing on this page.";
  }
  const done = `Done: ${o.rules} change${o.rules === 1 ? "" : "s"}. The label on the page tells you what changed.`;
  return o.rules <= 2 && o.intensity !== "strong"
    ? `${done} For a stronger effect, set Strength to Strong.`
    : done;
}
