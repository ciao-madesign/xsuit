# 22 — Language, typography and responsive (B20)

How xsuit behaves on pages in other languages and on narrow screens. Nothing here translates or rewrites content: xsuit only keeps its own changes safe.

## What xsuit reads

`src/analyzer/language.ts` looks at the page locally and keeps **counts only**, never text:

| Fact      | How                                                                                          |
| --------- | -------------------------------------------------------------------------------------------- |
| language  | primary subtag of `<html lang>` (null when the page does not say)                            |
| script    | dominant script of up to 2,000 sampled letters (Latin, CJK, Arabic, Hebrew, Cyrillic, other) |
| direction | `dir` on `<body>` or `<html>`, else the computed `direction`                                 |
| `cjk`     | at least 20 % of the letters are Han, kana or hangul, or `lang` is zh, ja or ko              |
| `rtlText` | at least 20 % Arabic or Hebrew letters, or `lang` is a right-to-left language                |

Fewer than 30 letters: the script is not reported. A page with Arabic text but no `dir="rtl"` is **not** re-laid out: xsuit only notes it.

## What xsuit does with it

| Case                             | Behaviour                                                                                                                                                                                                                           | Source                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Chinese, Japanese or Korean text | `line-height` is never set below **1.5** (the compact density effect says 1.4 on other pages). The change is listed in the apply report (`typography`).                                                                             | clreq 7.1.1 and jlreq: line gap 50–100 % of the font size, so 1.5–2.0   |
| Right-to-left pages              | Effects may use **logical properties only** (`padding-block`, `margin-inline-start`…). Physical `left`/`right`, `float` and `text-align: left/right` are refused, in the data and at runtime, so no effect can break an RTL layout. | design rule, tested                                                     |
| Text xsuit adds                  | English, marked `lang="en"` and `dir="ltr"`, so screen readers pronounce it correctly and it is not scrambled inside an RTL page. Copied shortcut links keep the `lang` and `dir` of their original.                                | WCAG 2.2 SC 3.1.2 Language of Parts                                     |
| Longer text (German, Finnish…)   | Spacing rules only add space; the accessibility guard (B15) undoes any rule that makes the page scroll sideways, at any width.                                                                                                      | doc 17                                                                  |
| Phone-sized width (under 600 px) | Rules that compare a **measurement with a threshold** do not run: the thresholds come from desktop-width measurements, so on a phone the difference is the device's, not the market's. Other rules are unaffected.                  | doc 08 (G8), doc 11 (1280 px); 600 px is a design choice, not a finding |

## What xsuit does not do

- **No machine translation, no language detection service.** A test scans the source for translation and language-detection calls.
- **No number, date or currency rewriting.** Changing a price or a date on a page is changing its meaning, and is exactly what a scam would do (decision #50). Formats are only _read_ as part of the language facts.
- **No font changes.** Font family and size stay forbidden effect properties; the browser's own fallback fonts apply.
- Labels xsuit adds on a page follow the interface language of the person (decision #61; machine-translated, not reviewed, with a notice). Marked with the language they are in. They are never produced by a translation service at run time.

## Checks

- Automatic: `tests/b20-language.test.ts` (18 tests: script and direction, CJK line height, logical properties, injected text marks, phone gate, no translation calls) and four new fixtures (`tests/fixtures/rtl-arabic.html`, `cjk-zh.html`, `cjk-ja.html`, `long-words-de.html`, all synthetic).
- Real Chromium (`npm run validate:browser`): 96 runs, with six pages also at 390 px wide; fails on a rule that adds sideways scroll or lowers a CJK paragraph under 1.5. On the new fixtures the density rule does not fire (they are not recognized as home pages), so the CJK line-height floor is proven in the unit tests, and the browser run proves that spacing and palette rules cause no overflow there.

## Limits and person tasks

- The CJK floor comes from layout guides for typeset pages, not screens; it is a lower bound, not a recommendation to raise every page.
- Right-to-left support is by construction (logical properties, DOM-order moves). Reading an adapted Arabic or Hebrew page with a native reader is a person task.
- Vertical writing and Korean-specific rules are not handled.
- The machine-translated interface languages would benefit from native review (see `29-plain-words-and-languages.md`).
