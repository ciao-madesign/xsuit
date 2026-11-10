# 10 — Transparency and safety (B8)

Choices validated by the user on 2026-11-10 (decisions #30–#35). Layers follow decision #21.

## What each layer shows

| Layer                               | Audience       | Contents                                                                                                                                                                                                                                              |
| ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Simple                            | everyone       | "Personalize this site" toggle; style choice (Original, Western style, China style). First activation with no style chosen asks in plain words (two buttons, one line each) and remembers the choice. The on-page label (below).                      |
| 2 Advanced (popup, collapsed)       | curious users  | master switch, depth, Hybrid (preliminary), Apply now, Restore original, link to options. Options page: label position (bottom left / bottom right / hidden), sites where xsuit always runs, **per-rule switches** (all sites), reset.                |
| 3 Research tools (popup, collapsed) | IX researchers | Measure this page + JSON export, **Check compatibility** (Full / Partial / Minimal, page type with its signals, every recognized component with source and signals, skipped rules with reasons). Evidence audit lives in `docs/07-evidence-audit.md`. |

## On-page label

Small semi-transparent pill ("xsuit · 3") overlaid in a fixed corner. It never moves page content (position: fixed, closed shadow root, built with textContent only, hidden in print, reduced-motion respected). Fades to low opacity after a few seconds; full on hover or keyboard focus. Click opens a panel: one-line summary, **Why?** (rule, plain description, evidence label, source ids), a note for rules undone by the guard or elements that could not be checked, **Undo**, **Close**. Shown only when xsuit actually changed something. Excluded from measurement and recognition (`data-xsuit-ui`).

**Undo scope (decision #36, to be confirmed):** restores this page now and keeps it original until the page is reloaded; it does not change site settings.

## Accessibility guard

After rules are applied, for each changed element compared with its "before" measurement:

- text contrast (WCAG 1.4.3: 4.5:1, 3:1 for large text), computed including the effect of saturate() filters on text and on backgrounds;
- minimum target size (24 px, WCAG 2.2 SC 2.5.8) for the element and its interactive descendants;
- horizontal scroll that was not there before (rules undone lowest priority first until it stops).
  A rule that measurably worsens any of these is undone **on that page** (rule-level, as validated), recorded with its reason, and not re-applied when the page changes. Background images or gradients, unknown filters, no text, or no layout are reported as "not verifiable" and the rule is kept (decision #34). Up to 100 elements per rule are checked, for speed.

### Correction made in B8

Earlier effect notes claimed that saturation filters keep luminance and therefore do not lower contrast. This was wrong: the CSS filter works on sRGB values. A simulation over a 5×5×5 RGB grid (pairs passing 4.5:1, text and background both filtered) shows `saturate(0.7)` pushes 3.9% below 4.5:1, `0.8` 2.7%, `1.2` 14.1%, `1.25` 17.6%. The figures are reproduced by `tests/b8.test.ts`, stored in `rules/effects.json` (`contrastSimulation`) and repeated in `docs/07`. They come from a synthetic grid, not real pages. The guard is what protects users; effect magnitudes remain a design choice to tune in B11 with real data (a smaller "vivid" step is likely).

## Checked in real Chromium

- Guard: a rule that shrank a clickable element from 46 px to 22 px was undone with the reason "a clickable element shrank from 46 px to 22 px (needs 24)".
- Label: fixed bottom-left, page scroll height unchanged, opened by keyboard, Undo removed the label and returned the page identical to the original.

## Not done or not testable here

- The browser permission prompt and the toolbar popup click need a person and a PC.
- Guard checks are per rule, not per element: one failing element undoes the rule for the whole page (as validated; finer control is possible later).
- The label panel's look in dark mode and on very narrow screens is not yet reviewed.
