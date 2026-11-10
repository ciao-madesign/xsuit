# 30 — Localization brief for companies (P5)

A company that wants to localize its own pages can open any page, adapt it to a market with one click, and then ask for a **brief**: a page that says what xsuit changed, why, with what evidence, and what a team would have to do to reproduce it. It is made on the person's device and is theirs to print or save.

## How to get it

Adapt a page, open the popup, **Advanced → Localization brief**. A new tab opens with the brief. If the page is not adapted the popup says there is nothing to report.

## What it contains

- Site name (host only), market, strength, date.
- A plain sentence: "xsuit changed N things on this page to match the X style."
- **Read this first**: tendencies from studies of two groups of sites, not rules; this page, at this moment; not tested with your users: test with real people before you decide.
- For each change: what changed in plain words, why (sites in this market usually do this), how solid the support is, the source names, how many elements were touched, **what the evidence does not show**, and **approximate CSS** for the team's own site (the values at the chosen strength, including those for images and links). Structural changes (moving, hiding, adding parts) say they have no single CSS rule. The technical details (rule, dimension, version, how sure xsuit was) are one level down, in English.
- Changes that were not applied and why.
- Buttons: **Print or save as PDF** and **Save as file** (JSON).

It is shown in the person's interface language (machine-translated except English, with the usual notice, decision #61); the technical lines stay English.

## Privacy

The format `xsuit.brief/1` is closed: a test refuses extra fields, a host that is not a bare site name (no path, query or port), and anything the personal-data scanner finds. The brief holds **no page text, no screenshot, no address path or query**. Nothing is uploaded: the popup builds it in the page, hands it to the brief page through session storage, and the page shows it from there. It works offline. The saved file contains the same fields and nothing else.

## What it is not

- Not an audit, a score or a recommendation of a market. It reports what the rules did.
- Not a guarantee for the company's audience. The studies behind the rules are about two samples; the notes say so on the page.
- Not a replacement for testing with users. The method for that is in `24-ux-validation-methodology.md`.

## Checks

`tests/p5-brief.test.ts` (9 tests): a real fixture adapted and turned into a brief (reasons, sources, versions, CSS); host only, no path, query or page text (a unique string on the page never appears); CSS follows the strength (1.4 at Standard, 1.35 at Strong) and structural changes carry none; empty brief when nothing changed; the closed format; the brief page shown in English and Italian, with the notes, the CSS and the footer; an empty or tampered brief shows only the empty message; the page works offline. The brief is in the release build (`p1-release.test.ts`), and the page loads without errors in real Chromium.

## Limits

- The CSS is approximate: effects are written for the engine's selectors, and the company applies them to its own markup.
- One page, one moment. No comparison across pages or markets in one brief.
- Not tried with a company yet.
