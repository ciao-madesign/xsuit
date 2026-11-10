import {
  applyToDocument,
  isMachineTranslated,
  LANGUAGES,
  LANGUAGE_NAMES,
  resolveLanguage,
  translator,
  type Lang,
  type LanguageChoice,
  type Translate,
} from "./index";

/** Fills the language menu and the "machine-translated" notice. Returns the language in use. */
export function showLanguageUi(
  doc: Document,
  choice: LanguageChoice,
  browserLanguage: string | undefined,
): { lang: Lang; t: Translate } {
  const lang = resolveLanguage(choice, browserLanguage);
  const t = translator(lang);
  applyToDocument(doc, lang, t);
  const sel = doc.getElementById("language") as HTMLSelectElement | null;
  if (sel) {
    sel.replaceChildren();
    const auto = doc.createElement("option");
    auto.value = "auto";
    auto.textContent = t("language.auto");
    sel.append(auto);
    for (const l of LANGUAGES) {
      const o = doc.createElement("option");
      o.value = l;
      o.textContent = LANGUAGE_NAMES[l];
      sel.append(o);
    }
    sel.value = choice;
  }
  const notice = doc.getElementById("notice");
  if (notice) {
    notice.hidden = !isMachineTranslated(lang);
    notice.textContent = isMachineTranslated(lang) ? t("notice.auto") : "";
  }
  return { lang, t };
}
