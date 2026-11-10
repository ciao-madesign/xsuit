# 31 — From here to a first MVP you can verify on your PC

State on 2026-11-10: builds B12–B22 and P1–P5 are done and tested (unit tests, real Chromium, synthetic pages). Nothing has been tried on real sites by a person, in a real toolbar click, or with real users. The MVP below is the smallest thing that **you** can load and judge.

**MVP definition.** Chrome on your PC; the release build loaded unpacked; on ordinary public sites you can: choose a market, adapt a page with one click, see what changed and why, switch strength and language, get a localization brief, always-on for a site, and undo, with nothing broken and nothing sent.

## Steps, ordered by importance and ease

| #   | Step                                                                                                                                                                         | Who          | Effort       | Why it matters                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ----------------------------------------------------------------------------- |
| 1   | **Build and load on your PC** (commands below) and run the 10-minute smoke test                                                                                              | you          | 15 min       | Proves the product exists outside my test machine. Everything else follows    |
| 2   | **Try 8–10 real sites** you know (logged out, 1280 px): a few Western, a few Chinese, one news, one shop, one search; note what changes, what looks wrong, what does nothing | you          | 1–2 h        | The biggest unknown: results on real pages. Tests use synthetic ones          |
| 3   | **Fix what step 2 shows**, worst first (broken layout, unreadable text, popup problems)                                                                                      | me           | 1–3 days     | Turns a prototype into something usable                                       |
| 4   | **P6a: icons and first-try guide**: toolbar icon, a README section "try it" with exact steps for Windows, Mac and Linux                                                      | me           | small        | Makes step 1 work for anyone, and the extension look finished                 |
| 5   | **Check the two key studies by hand** (Li 2022, Li 2026: `docs/12`, sources marked unverified): read the numbers my rules cite                                               | you          | 1–2 h        | Without it the evidence claims stay "unverified"                              |
| 6   | **Keyboard and screen-reader pass** on the popup and the on-page label (Tab, Enter, Esc; one screen reader)                                                                  | you          | 1 h          | Accessibility is a promise of the product (`docs/17`)                         |
| 7   | **Firefox and Edge smoke test** (`docs/23`); confirm the Firefox extension id                                                                                                | you          | 30 min       | Cheap, widens who can use it                                                  |
| 8   | **Read the translations** if you or a friend speak one of the six languages; fix `src/i18n/<language>.ts`                                                                    | you / friend | per language | The notice admits they are unreviewed; reading lowers the risk                |
| 9   | **Small test with 5–12 people** (`docs/24`, `npm run study`): first a pilot with 2–3                                                                                         | you          | days         | The only way to know if adapted pages are actually easier. Decides go / no-go |
| 10  | **P6b: release readiness**: store texts (with the machine-translation notice), privacy policy, version 1.0.0, zips for the three browsers                                    | me           | 1 day        | Needed only to publish, not for the MVP                                       |
| 11  | **Adapter verification on real sites** (`adapters/VERIFY.md`) and own measurements (`docs/13`)                                                                               | you          | hours        | Optional: the generic recognition works without it                            |
| 12  | **Publish**: store accounts and review; enable GitHub private vulnerability reporting                                                                                        | you          | days         | Last: after steps 1–9 you know what you are publishing                        |

**The path to the MVP is steps 1–4** (about a week with your feedback in the loop). Steps 5–8 make it trustworthy; 9 makes it proven; 10–12 make it public.

## Step 1 on your PC

Needs Node.js 22 or newer and Git.

```bash
git clone https://github.com/ciao-madesign/xsuit.git
cd xsuit
git checkout claude/loving-hopper-lif32i
npm ci
npm run build
```

Then in Chrome: `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → choose the `dist` folder. Pin the xsuit icon. Optional: `npm run check` runs every test (about a minute); `npm run build:dev` and `dist-dev` give you the research tools too.

## 10-minute smoke test

1. Click the icon on a normal https page: the first-run question appears; choose a market.
2. Click **Adapt this page**: the page changes, a small label shows in a corner, the popup says what happened. No permission prompt.
3. Open the label: plain sentences, reasons and sources; **Technical details** opens one level down.
4. Click **Undo** in the label, then adapt again; click **Back to original** in the popup.
5. Change **Strength** to Strong, then Light: the page follows.
6. Turn on **Always on this site**: a permission prompt for that site only; reload: the page is adapted at once. Turn it off.
7. **Advanced → Language**: choose Italian, then Arabic: texts change, Arabic reads right to left, the notice about automatic translation is visible.
8. **Advanced → Localization brief** on an adapted page: a new tab with the brief; try Print and Save.
9. Open a bank or login page: xsuit must leave it alone and say so.
10. Open `chrome://extensions` as the current tab: the popup explains it cannot adapt it.

Anything that does not match: note the site, what you did, what you expected. That list is step 3's input.

## What you should expect on real sites (honest)

- Pages whose type xsuit does not recognise get only a few changes (spacing, link underline) or none, and the popup says so.
- Chinese-style changes on a Western page are modest by design (spacing, saturation, emphasis, shortcuts): xsuit does not rebuild a site.
- Some sites will resist (heavy scripts, canvases, shadow DOM, frames). The safe response is to do nothing, not to break the page.
- Per-site adapters are all unverified; recognition is generic.
