# 12 — Internal validation (B11)

Date: 2026-11-10. Scope: what can be checked from the build container (no access to real sites). This report states what was verified, what was not, and the go/no-go for Deep mode.

## How the checks run

- `npm run validate:browser` (real Chromium, extension loaded): for every fixture (5 files plus generated pages of 1,000 and 5,000 paragraphs) × 3 profiles × 2 depths = **42 runs**: apply, restore, compare HTML. Raw results: `research/validation/results.json`. (Chromium itself adds empty `style=""` attributes after rendering; they are ignored in the comparison.)
- `npm test` (`tests/b11.test.ts`): privacy checks on the source and manifest.
- `npm run replication`: A3 check over `research/measurements/` (needs the user's data).

## Results against the acceptance criteria (spec §15, §17)

| Criterion                          | Threshold (written before the run)                                        | Result                                                                                                | Status                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full restore                       | 100% of runs identical after restore                                      | 42 / 42 identical                                                                                     | Passed on fixtures                                                                                                                                    |
| Stability (DOM and JS errors)      | 0 uncaught errors                                                         | 0 in 42 runs (404s of missing fixture images ignored)                                                 | Passed on fixtures                                                                                                                                    |
| Performance                        | Transformation under 500 ms on a page of about 10,000 elements            | max 235 ms (5,000-paragraph page); 5–30 ms on small fixtures                                          | Passed on fixtures                                                                                                                                    |
| No data sent out                   | 0 external requests; no network API in the code                           | 0 external requests in 42 runs; source has no fetch/XHR/beacon/WebSocket; no host permission up front | Passed                                                                                                                                                |
| Accessibility maintained           | 0 rules undone because of a regression, or each undo explained            | 0 rules undone by the guard on the fixtures                                                           | Passed on fixtures only (fixtures are simple; vivid saturation lowers contrast on about 18% of passing pairs in the synthetic simulation, see doc 10) |
| Original functions intact          | No removed content; controls still work                                   | Collapse and shortcuts only hide or add; restore exact; protected areas never touched                 | Passed by design and tests; not tested on complex real sites                                                                                          |
| Recognition precision              | Not measured                                                              | Not measured (no labelled real pages)                                                                 | Not verified                                                                                                                                          |
| Rules replicate on real sites (A3) | Direction replicated on at least 3 Western and 3 Chinese sites per metric | No measurements yet                                                                                   | **Not verified**                                                                                                                                      |
| Effect magnitudes tuned (A5)       | Chosen from measured medians                                              | No measurements yet                                                                                   | **Not verified**                                                                                                                                      |
| Adapters verified                  | `tested` status after `adapters/VERIFY.md`                                | All 10 are drafts                                                                                     | **Not verified**                                                                                                                                      |
| Source figures verified            | Li 2022 / Li 2026 checked against the papers                              | Not checked (publisher access refused)                                                                | **Not verified**                                                                                                                                      |
| Users of the reference markets     | Real-user tests                                                           | Deferred past V1 (decision #8)                                                                        | Not done                                                                                                                                              |

## Go / no-go for Deep mode

**Provisional no-go.** The engine is safe and reversible on everything tested here, but Deep mode (changing interaction paths and adding components) would build on rules whose direction has not been replicated on real commercial sites, adapters that have not been verified, and magnitudes that are design choices. The criteria to change the verdict to "go":

1. A3 done: for each rule that Deep mode would extend, the study's direction is replicated (or the rule is downgraded).
2. At least the adapters of the sites Deep mode targets are `tested`.
3. Li 2022 and Li 2026 figures verified against the papers.
4. A5 done: magnitudes taken from measured medians, accessibility re-run on real pages with 0 unexplained regressions.
5. Restore rate stays 100% on those real pages.

## Protocol for the evidence track (needs a PC)

**A2 measurements.** Follow `research/measurements/README.md`. Minimum: 3 Western and 3 Chinese sites, three page types each where possible.

**A3 replication.** After A2, run `npm run replication`. A metric is "replicated" only with at least 3 files per side and China's median higher than the West's. For "not-replicated" metrics, downgrade the listed rules (evidence level and `gaps`) and regenerate `docs/07-evidence-audit.md` with `npm run evidence`.

**A5 tuning.** For each visual effect in `rules/effects.json`: take the median of the target profile's measured range for the related metric (e.g. media per 1,000 px) and choose the smallest effect that moves a page from the other profile's median toward it; re-measure with the comparison report and keep the change only if the accessibility guard stays quiet. Record the numbers in the effect's `basis`.

**Adapters.** Follow `adapters/VERIFY.md`.
