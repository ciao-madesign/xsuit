# 21 — Scorecard and explanation (B19)

Two things that make xsuit's changes understandable: a **descriptive scorecard** (where a page sits, dimension by dimension) and an **explanation for every change** (what, why, evidence, sources, version, how sure, how to turn it off).

## Scorecard

**What it is.** For each of the 12 dimensions (`20-market-profile-model.md`) the comparison report shows the metrics that describe it, before and after xsuit, and — only where the sources give a number — where the page sits between two studied samples.

**What it is not.** Not a quality score, not a usability measure, not a ranking of markets. No score, grade or verdict exists anywhere in the data (a test scans every key and text; the closed report schema refuses any extra field). The report states: _"Descriptive only … neither sample is better or worse than the other."_

**How the position is computed (one formula, visible).** `position = (value − Western sample mean) / (China sample mean − Western sample mean)`. 0 = at the Western sample mean, 1 = at the China sample mean, and it can be below 0 or above 1. "Nearer to" says Western sample, China sample, or in between (position within 0.15 of 0.5). The sample means come from `rules/baselines.json` (Li et al. 2026, municipal homepages, provisional; the primary text of that study is not yet verified).

**Where numbers exist.** Only three metrics have sample means today: media per 1,000 px (Density), main blocks (Entry points) and peripheral blocks (Sidebar). Every other dimension shows what was measured (e.g. saturation for Palette) and says, in words, that the sources give a direction and not a number, or that no metric describes it yet. No threshold or reference is invented; when real measurements exist (B14, `npm run replication`) adding them to `baselines.json` extends the scorecard without code changes.

**Which metric describes which dimension** is our own approximate choice, listed in `rules/dimensions.json` (`measures`), and grounded in the study indicators already used by the replication check.

**Other limits.** Our metrics approximate the study's (definitions differ, e.g. what "1,000 px" refers to); the samples are institutional sites, not the commercial sites xsuit runs on; one page is one observation.

## Explanation of each change

| Question                                                  | Where answered                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| What changed?                                             | rule title and description; element count                                                                       |
| On which dimension?                                       | "Information density: compact" (dimension and pole)                                                             |
| Why?                                                      | rationale in the rule; evidence label (strong / moderate / early / hypothesis)                                  |
| Which sources?                                            | source ids with the locator inside the source                                                                   |
| Which version of the rule?                                | rule version (history in `rules/`)                                                                              |
| How sure was xsuit about the part of the page it changed? | lowest recognition confidence among the rule's components (low / medium / high; "n/a" when none was recognized) |
| What does the evidence not show?                          | first limit of the rule                                                                                         |
| How do I turn it off?                                     | "Options, then rule …" (per-rule switches; the rule id is the same on every site)                               |

Shown in the on-page **Why?** panel and in the comparison report (table, plus JSON). The report is now `xsuit.report/3` (closed schema, `schemas/report.schema.json`): rules carry `version`, `dimension`, `pole`, `sources`, `confidence`; `scorecard` carries the rows above.

## Checks

`tests/b19-scorecard.test.ts`: deterministic on every corpus page; one row per dimension; position only where the sources give a number; nulls (never invented numbers) when a page could not be measured; no score/grade/rank/verdict keys or words; end to end on a real page, every rule in the report links to the rule's version, dimension, pole and registered sources and the report passes the schema and the export gate; the "Why?" content has all eight answers.

## Not done here

- Comparing a page with Hybrid or custom configurations (only the two reference samples have numbers).
- A history chart across pages (each report is one page, shown once and not stored).
- Rule review: all rules still say `lastReviewed: never`.
