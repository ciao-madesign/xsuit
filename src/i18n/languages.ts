// Interface languages. English is the reference; the others are machine-translated and not reviewed
// by a person (decision #61). Kept apart from the texts so settings can validate a code cheaply.

export const LANGUAGES = ["en", "it", "es", "fr", "de", "zh", "ar"] as const;
export type Lang = (typeof LANGUAGES)[number];
export type LanguageChoice = "auto" | Lang;

/** Each language written in itself, so a person can find theirs. */
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  it: "Italiano",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "简体中文",
  ar: "العربية",
};

export const RTL_LANGUAGES: readonly Lang[] = ["ar"];

/** The language to use: the person's choice, or the browser's language when it is one we have, else English. */
export function resolveLanguage(choice: LanguageChoice, browserLanguage?: string): Lang {
  if (choice !== "auto") return choice;
  const base = (browserLanguage ?? "").toLowerCase().split(/[-_]/)[0] ?? "";
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Lang) : "en";
}
