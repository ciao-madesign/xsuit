# 28 — Strength and plain feedback (P3)

Two things that make the one click worth it: the person chooses **how strongly** a style is applied, and xsuit always says **what happened**, including when little or nothing changed. The measured effect is in `27-visible-value.md`.

## Strength: Light, Standard, Strong

- A **Strength** menu sits under the switch (Light / Standard / Strong). Default: Standard.
- It changes only the **size** of the changes. Which rules run, and in which direction, never changes: the direction comes from the cited evidence, the size from design judgment (as since B8; every effect says so).
- **Standard is exactly what xsuit did before**: the golden test of B18 still passes unchanged.
- Each effect with a magnitude has the three values in `rules/effects.json` (`declarations` = Standard, `levels.light`, `levels.strong`). Examples: Western spacing padding 1.25 / 1.5 / 2.25 rem; China density line height 1.5 / 1.4 / 1.35 and gap 0.75 / 0.5 / 0.25 rem; saturation filters 0.9 / 0.8 / 0.7 and 1.12 / 1.25 / 1.4.
- Every level goes through the same checks as before: forbidden properties (no colour, size of text, hiding, position), logical properties only, the CJK line-height floor, and the runtime accessibility guard (contrast, target size, sideways scroll). Strong is not allowed to be unsafe: the guard undoes any rule that measurably worsens the page, at every strength.
- Changing the strength re-applies the page at once.

## Plain feedback after "Adapt this page"

| Situation                              | What the person reads                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| changes made                           | "Done: N changes. The label on the page tells you what changed."                                         |
| 1–2 changes and Strength is not Strong | the same, plus "For a stronger effect, set Strength to Strong."                                          |
| the guard undid everything             | "xsuit undid its changes because they would have made this page harder to read or use."                  |
| login, payment or consent page         | "This page asks for a password or payment details, so xsuit leaves it alone."                            |
| narrow window                          | "This window is phone-sized. xsuit's measured styles only run on desktop-width pages: widen the window." |
| page already near the target           | "This page is already close to the China style." (or Western)                                            |
| nothing recognised                     | "xsuit could not recognise the parts of this page, so it left it alone."                                 |
| anything else                          | "Nothing needed changing on this page."                                                                  |

## Findings from the measurement (corpus of 34 synthetic pages, real Chromium, 1280 px)

- 30 of 34 pages (88 %) change visibly for each market; the 4 that do not are pages xsuit cannot classify (div soup, empty app shell, heuristic-only search page). For those the popup says it could not recognise the page.
- About 12–15 % of a page's elements are targeted at the median.
- The accessibility guard undid nothing at any strength on this corpus.
- Strength changes the size (for example Western header padding 12, 24 and 36 px), not the number of pages that change.

## Not done, on purpose

- No rule was widened to pages of unrecognised type: the density rules rest on evidence from home pages, so extending them would exceed their evidence.
- No "intensity" tuned per site. One setting for everything.

## Checks

`tests/p3-value.test.ts` (6 tests): every level passes the safety checks; the levels move monotonically from weak to strong; Standard equals the old catalog and the old default; the page gets the chosen strength and changes it live; each feedback sentence. Real Chromium: `npm run validate:browser` now also runs the Strong level on every page (156 runs, 0 failures); `npm run value` regenerates the measurement.

## Limits

"Visible" means the page measurably differs, not that a person notices or prefers it. The size of each level is a design choice and has not been tested with people.
