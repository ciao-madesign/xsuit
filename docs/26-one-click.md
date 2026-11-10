# 26 — One click (P2)

What a person sees and does. Nothing about the research or the rules needs to be understood.

## First run

The popup opens on one question: **"Adapt the style"** with two choices, Western and China, each with one plain line. A suggestion based on the browser language appears underneath (Chinese browser language: China; any other language: Western). It is only a suggestion: nothing is chosen until the person presses a button. The choice is saved (`onboarded`) and the screen does not come back.

## Normal use

| Element                      | What it does                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Market: …** and **Change** | Shows the chosen market; Change opens the two choices again. If the page is adapted it follows the new market.                                              |
| **Adapt this page**          | One click. Works with `activeTab` alone: the page script is injected by the click, so **no permission prompt appears**. The result is said in one sentence. |
| **Back to original**         | Same button once the page is adapted. The page stays original until it is reloaded or adapted again (also when the site is set to always run).              |
| **Always on this site**      | The only thing that asks for access to a site (that site only, https). Turning it off removes the access.                                                   |
| **Advanced** (collapsed)     | xsuit on/off everywhere, depth (visual or structural), "Use my custom mix" with a link to compose it, and all options.                                      |

Pages that cannot be changed (browser pages, stores) show a plain explanation instead of the switch. If xsuit is turned off in Advanced, the switch is disabled and says why.

## What was removed from the main view

The three-way style list including "Original", "Apply now" and "Restore original" (the one switch replaces them), the custom mix (now Advanced), and everything research-related (developer build only, decision #58).

## Checks

- `tests/p2-popup.test.ts` (10 tests): the view for each state, and the real popup page with a fake browser: first run, one click adapts (page script injected, **zero** permission requests), one click restores, "Always on this site" is the only permission request, browser pages explained, custom mix only under Advanced.
- `npm run validate:browser`: the popup page loads in real Chromium without errors, for first run and normal view; 96 page runs unchanged.
- Person: try it cold on a few pages; the click-through with the real toolbar button (activeTab needs a real user click, which automation cannot give) is part of the smoke test in `docs/23`.

## Limits

The result sentence only counts changes ("Done: 3 changes"). Saying what is visibly different, or why nothing changed, is P3. Texts are English; other languages are P4.
