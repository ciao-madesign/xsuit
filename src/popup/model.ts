// What the popup shows, decided by pure functions (tested without a browser).
// Every text comes from the interface table (src/i18n) through `t`.

import type { Key, Translate } from "../i18n";
import type { ProfileChoice, Settings } from "../shared/settings";

export type Market = "western" | "china";
export const MARKET_IDS: Market[] = ["western", "china"];

/** Only a suggestion shown on the first-run screen. The person always chooses. */
export function suggestMarket(language: string | undefined): Market | null {
  const l = (language ?? "").toLowerCase();
  if (l.startsWith("zh")) return "china";
  return l ? "western" : null;
}

export function marketName(profile: ProfileChoice, t: Translate): string {
  if (profile === "hybrid") return t("market.custom");
  if (profile === "western" || profile === "china") return t(`market.${profile}.name`);
  return t("market.none");
}

export type View =
  | { kind: "onboarding" }
  | { kind: "unsupported"; message: string }
  | { kind: "home"; toggle: { label: string; disabled: boolean }; hint: string };

export interface ViewInput {
  settings: Settings;
  supported: boolean;
  /** Key of the plain-words reason when the page cannot be adapted. */
  unsupportedKey?: string;
  adapted: boolean;
}

export function viewFor(i: ViewInput, t: Translate): View {
  if (!i.settings.onboarded || i.settings.profile === "original") return { kind: "onboarding" };
  if (!i.supported)
    return {
      kind: "unsupported",
      message: t((i.unsupportedKey as Key | undefined) ?? "support.internal"),
    };
  const market = marketName(i.settings.profile, t);
  if (!i.settings.enabled)
    return {
      kind: "home",
      toggle: { label: t("home.adapt"), disabled: true },
      hint: t("hint.off"),
    };
  return i.adapted
    ? {
        kind: "home",
        toggle: { label: t("home.restore"), disabled: false },
        hint: t("hint.adapted", { market }),
      }
    : {
        kind: "home",
        toggle: { label: t("home.adapt"), disabled: false },
        hint: t("hint.ready", { market }),
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
export function adaptMessage(o: AdaptOutcome, t: Translate): string {
  if (!o.applied) {
    if (o.reverted.length) return t("result.undone");
    if (has(o, /asks for a password or payment/)) return t("result.sensitive");
    if (has(o, /phone-sized viewport/)) return t("result.phone");
    if (has(o, /already at or (below|above) the target/))
      return t("result.close", { market: o.market });
    if (!o.recognized.length) return t("result.unknown");
    return t("result.nothing");
  }
  const done = t("result.done", { n: o.rules });
  return o.rules <= 2 && o.intensity !== "strong" ? `${done} ${t("result.stronger")}` : done;
}
