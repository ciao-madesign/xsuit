import { ar } from "./ar";
import { de } from "./de";
import { en, type Key } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";
import { RTL_LANGUAGES, type Lang } from "./languages";
import { zh } from "./zh";

export type { Key };
export { LANGUAGES, LANGUAGE_NAMES, RTL_LANGUAGES, resolveLanguage } from "./languages";
export type { Lang, LanguageChoice } from "./languages";

const TABLES: Record<Lang, Record<Key, string>> = { en, it, es, fr, de, zh, ar };

export type Translate = (key: Key, params?: Record<string, string | number>) => string;

/** Returns a translate function for a language. A missing text falls back to English, never to nothing. */
export function translator(lang: Lang): Translate {
  const table = TABLES[lang] ?? en;
  return (key, params) => {
    const text = table[key] ?? en[key] ?? key;
    return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => String(params[k] ?? m)) : text;
  };
}

export const isRtl = (lang: Lang): boolean => RTL_LANGUAGES.includes(lang);

/** Whether this language is a machine translation that must carry the notice. */
export const isMachineTranslated = (lang: Lang): boolean => lang !== "en";

/** The plain-words sentence for a rule, or null when there is none (the technical text is used then). */
export function ruleText(t: Translate, ruleId: string): string | null {
  const key = `rule.${ruleId}` as Key;
  return key in en ? t(key) : null;
}

/**
 * Fills a page that marks its texts with data-i18n="key" (and data-i18n-aria-label="key" for
 * attributes), and sets the document language and direction.
 */
export function applyToDocument(doc: Document, lang: Lang, t: Translate): void {
  doc.documentElement.lang = lang;
  doc.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  for (const el of doc.querySelectorAll<HTMLElement>("[data-i18n]"))
    el.textContent = t(el.dataset.i18n as Key);
  for (const el of doc.querySelectorAll<HTMLElement>("[data-i18n-aria-label]"))
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel as Key));
  for (const el of doc.querySelectorAll<HTMLElement>("[data-i18n-title]"))
    doc.title = t(el.dataset.i18nTitle as Key);
}
