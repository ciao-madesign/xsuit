# 17 — Accessibility testing (B15)

xsuit's accessibility guard protects users from regressions caused by xsuit's own changes. **It is not a WCAG audit.** This page lists what is checked automatically, what is not, and what a person should check.

## Checked automatically (per rule, on the page, every run)

| Check                 | WCAG                          | How                                                                                                           | Notes                                                                                                                                                                            |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text contrast         | 1.4.3 (4.5:1; 3:1 large text) | before/after, including `saturate()` filters                                                                  | Backgrounds with image/gradient, other filters, or no layout are reported as "not verifiable" and the rule is kept                                                               |
| Target size           | 2.5.8 (24 × 24 CSS px)        | element and interactive descendants, before/after                                                             | **Exceptions modelled:** _spacing_ (24 px circle intersects no other target) and _inline_ (link inside a sentence). A target already failing before xsuit is not blamed on xsuit |
| Keyboard reachability | 2.1.1, 2.4.3 (partly)         | interactive elements that could take focus must still render                                                  | Hidden behind xsuit's own "Show" button is allowed (the button takes focus)                                                                                                      |
| Horizontal scroll     | 1.4.10 (reflow, partly)       | page must not start scrolling sideways                                                                        | Rules are undone lowest priority first                                                                                                                                           |
| Zoom / resize         | 1.4.4, 1.4.10                 | on window resize or browser zoom the page is restored, re-measured at the new width and rules re-applied      | Zooming to 200 % halves the CSS viewport width; a rule that causes sideways scroll there is undone                                                                               |
| Focus indicators      | 2.4.7                         | effects may **never** remove or hide an outline (`outline: none`, `0`, `transparent`, `box-shadow`)           | Enforced at runtime and in tests                                                                                                                                                 |
| Motion                | 2.3.3, 2.2.2                  | effects may never use `animation`, `transition`, `scroll-behavior`; xsuit's own label respects reduced motion |                                                                                                                                                                                  |
| Fixed sizes           | 1.4.4, 1.4.10                 | effects may not set fixed widths (only `100%`/`auto`), heights or `overflow`                                  |                                                                                                                                                                                  |

A rule that fails a check is undone **on that page**, with the reason shown in the on-page label.

## Not modelled (be honest about these)

- Target-size exceptions _equivalent_ (same function elsewhere on the page), _user agent control_ (native unstyled controls) and _essential_: a target in these cases may be undone although WCAG would allow it. This errs on the side of leaving the page original.
- Focus **order** after `reorder`/`group`: moving blocks changes DOM order by design; whether the new order is meaningful needs a person.
- Visible focus style on the page's own elements: xsuit never removes it, but cannot confirm the page has one.
- Text spacing (1.4.12), screen-reader output, reading order, colour-only information (1.4.1), captions and many other criteria: not checked.
- Layout at real zoom: the check re-runs after a resize event; it cannot simulate zoom beforehand.

## Checks for a person (before claiming accessibility on a site)

1. **Keyboard:** with xsuit on, Tab through the page on 3 sites. Every control must be reachable, focus visible, no trap, the order sensible. Compare with xsuit off.
2. **Zoom:** at 200 % and 400 % no content or function is lost; no sideways scroll in the adapted page where the original had none.
3. **Screen reader (NVDA or VoiceOver):** the shortcut strip and "Show/Hide" buttons are announced with sensible names; collapsed content is not read while hidden.
4. **Reduced motion:** with the OS setting on, nothing animates.
   Record results in `research/observations/` sheets with browser, date and pages.

## Where it lives

`src/engine/a11y.ts` (guard), `src/engine/forbidden.ts` (forbidden effect properties), `Engine.reflow()` and the resize listener in `src/content/index.ts`. Tests: `tests/b15.test.ts`, `tests/b8.test.ts`. Real Chromium: `npm run validate:browser` (36 runs, 0 failures at B15).
