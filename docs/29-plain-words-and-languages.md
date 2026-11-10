# 29 — Plain words and languages (P4)

## Plain words

The panel on the page (the label in a corner, then its details) is written for someone who has never heard of dimensions, poles or evidence levels.

For each change it shows, in this order:

1. **What changed**, in one plain sentence ("Livelier colours: slightly more saturated.").
2. **Why**: "Sites in this market usually do this.", then how solid the support is in plain words (_Backed by strong studies_, _Backed by some studies_, _Early evidence_, _An idea not yet tested_) and the source names.
3. **How to turn it off** ("Options, then Rules").
4. One level down, under **Technical details**: the rule's own title and evidence label, dimension and pole, rule version, how sure xsuit was about the page part, and the limit of the evidence. This part stays in English (the technical wording is the source of truth) and is marked `lang="en"`.

The plain sentences exist for all 19 rules (`rule.<id>` in the interface table, checked by a test). A rule without one falls back to its technical text.

## Languages

Interface languages: **English** (reference), Italiano, Español, Français, Deutsch, 简体中文, العربية (right to left).

- The language follows the browser; the person can choose another in the popup (Advanced) or in Options. A language the browser reports that xsuit does not have falls back to English.
- **Every language except English is machine-translated and has not been reviewed by a person.** This is said in the interface itself: a notice appears under the language menu in the popup and in Options, in that language: _"This language was translated automatically and has not been reviewed by a person. It may contain mistakes. English is the reference."_ Store text must say the same (P6).
- The translation was made once, when the texts were written, and is stored in the extension (`src/i18n/*.ts`). Nothing is translated while xsuit runs, nothing is sent to a translation service, and the page's own text is never translated (decision #55 still holds).
- What is translated: the popup, the first-run screen, the on-page label and its panel, the plain sentences for the rules, the messages after "Adapt this page", and the main sections of Options (label, sites, reset, privacy). What stays English: rule names in the Options list, the custom-mix editor, developer tools, and the technical details.
- Machine translation can be wrong. Short interface texts are the safest case, but anyone who reads a language well can improve a file: change the text in `src/i18n/<language>.ts` (keep the `{placeholders}`) and a test checks that nothing is missing. If a person reviews a language, remove it from the machine-translated list in `isMachineTranslated` and its notice.

## Checks

`tests/p4-i18n.test.ts` (24 tests): every language has every text with the same placeholders and none empty; few texts left identical to English (an untranslated leftover would show); every rule has a plain sentence; fallback to English; the notice exists in each non-English language; language choice and direction; popup and options contain no visible text outside the table; the on-page label in English, Italian and Arabic (right to left, technical part marked English); the popup page in Arabic.

## Limits

- Quality of the six translations is unknown: no native speaker has read them.
- Plain sentences say what a rule does, not how much it will change a given page.
- Other languages (Japanese, Korean, Portuguese, Russian…) are not included yet; adding one means a new table file and an entry in `languages.ts`.
