# 25 — Product re-plan: a tool for people first (ACCEPTED 2026-11-10)

**Direction given by the owner (2026-11-10).** xsuit is a practical browser extension for people: one click and the page takes the conventions of the user's reference market. Companies may also use it to see how their pages would look localized. Research, measurement and data collection are marginal and developer-side only.

## What the earlier plan got wrong

| Point                                   | Problem                                                                                                                                                    | Correction                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Builds B10–B22 centred on evidence work | Measurement, reports, scorecard, export gates and study files sit inside the product and its popup ("Research tools").                                     | They leave the shipped extension. They stay in the repository as developer tools.             |
| "Hide research in a section"            | Hidden code still ships, still needs review, still widens the attack surface.                                                                              | Two builds: **release** (no research code at all) and **dev** (everything).                   |
| Focus on the interface only             | The real risk is value: on many pages few rules fire and the change is subtle. A one-click product must give a visible, dependable result, or say why not. | A build dedicated to visible value, measured on the test corpus.                              |
| "Custom" as a main choice               | Brings dimensions and poles back in front of ordinary users.                                                                                               | Custom moves to Advanced.                                                                     |
| Company use = preview                   | A preview alone gives a company nothing to act on.                                                                                                         | A **localization brief**: what changed, why, with limits, made locally and saved by the user. |
| Not mentioned                           | The interface is English only; no first-run choice; no store material.                                                                                     | Interface languages, first run, release readiness.                                            |

## What stays unchanged

Safety and honesty are the product's value, not research overhead: local only, nothing sent, reversible, accessibility guard, anti-misuse rules, protected pages, adapters as optional hints, works on any site, every rule traceable to a source. No rule is added without a source.

## Product, in one paragraph

Install → choose your market once → on any page, one click on the icon adapts it; one click restores it. "Always on this site" is optional and asks for access to that site only. A short panel says in plain words what changed. Nothing is collected.

## Builds (each verifiable, one at a time, after the owner's go-ahead)

### P1 — Product definition and clean split

- Decision #58; README rewritten for users; `docs/03-extension-spec` aligned; research documents grouped as developer documentation.
- Build flag: `npm run build` = **release** (no measurement, report, export, scorecard, study code); `npm run build:dev` = everything.
- Checks (A): a test fails if the release bundle contains research code or its messages; release size reported; all security invariants hold on both.

### P2 — One click

- First run: choose the market (suggested from the browser language, never decided for the user).
- Popup: one large switch (Adapt this page / Back to original), the market name, "Always on this site". Advanced (collapsed): depth, custom mix, per-rule switches, all options.
- No "Research tools" in release.
- Checks (A): popup tests for the three actions; one-click path works with `activeTab` alone (no permission prompt); real-Chromium run. (P): a person tries it cold.

### P3 — Visible value

- Audit on the corpus: per market and page type, how many pages change and how much.
- Where evidence allows, an **intensity** setting (light / standard) instead of single modest values; never beyond the accessibility guard.
- When little or nothing applies, the popup says so in plain words ("This page is already close to this style" / "xsuit could not recognise this page").
- Checks (A): share of corpus pages with a visible change, recorded before and after; zero guard regressions; restore still exact.

### P4 — Plain words and languages

- "What changed" panel rewritten for non-experts (sources and versions one level down).
- Interface strings in a table; English and Italian first. Other languages only with a native reviewer (no machine translation in the product).
- Checks (A): no hard-coded interface text outside the table; every key present in every language. (P): native review.

### P5 — For companies: localization brief

- From the popup (Advanced): a local page listing each change on the current page, the reason, the evidence level and the limits, printable or saved by the user. No upload, no page text, no screenshots.
- Checks (A): the brief passes the personal-data scan; contains no URL path; works offline.

### P6 — Release readiness

- Icons, store description, permission explanations, privacy policy ("collects nothing"), version 1.0.0, packaged zips for Chrome, Edge, Firefox.
- Checks (A): package contents listed and checked; manifest invariants. (P): smoke test in the three browsers; store submission by the owner.

## Developer-side only (kept, not shipped)

`npm run` scripts for corpus, replication, measurements, privacy checks, adapters verification and the B22 study. They help developers test whether the tool works; they are not features.

## Owner's decisions (2026-11-10)

1. **Market names** stay as they are: "Western" and "China".
2. **Intensity is adjustable** (light / standard) in P3, only where the sources allow it.
3. **Interface language:** English is the reference. Other languages are **machine-translated without human review** (P4). This must be said clearly to the user, in the interface and in the store text. The translation is done when the strings are built, not by a service at run time, so nothing leaves the device. This replaces the earlier idea of waiting for native reviewers; a native review can still be added later and replaces the label.

## Progress

- **P1 done**: release and developer builds (see decision #58).
- **P2 done**: one click (decision #59).
- **P3 done**: strength and plain feedback (decision #60).
- **P4 done**: plain words and languages (decision #61).

## Honest limits to keep in view

- Only two reference markets have sources today. More markets need their own sources first.
- Site-specific adapters are still unverified; recognition is generic.
- No test with people has been run yet; the B22 method is ready for developers when wanted.
