# 05 — Decisions log

| #   | Decision                             | Choice                                                                                                                                                                                                                                                                               | Date       |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | Primary V1 user                      | UX designer / researcher                                                                                                                                                                                                                                                             | 2026-11-09 |
| 2   | MVP test sites                       | Paired Western and Chinese sites per category, used as reference for both profiles (see list below)                                                                                                                                                                                  | 2026-11-09 |
| 3   | Tech stack                           | TypeScript + Chrome Manifest V3, no heavy frontend framework                                                                                                                                                                                                                         | 2026-11-09 |
| 4   | Language                             | Everything in English (documents, code, extension UI)                                                                                                                                                                                                                                | 2026-11-09 |
| 5   | Work method                          | Open decisions are proposed one at a time; work proceeds in builds B0–B8 (`06-builds.md`)                                                                                                                                                                                            | 2026-11-09 |
| 6   | Rule format                          | Declarative JSON files under `rules/`, one set per profile; data only, never executable code                                                                                                                                                                                         | 2026-11-09 |
| 7   | Names                                | Project: **xsuit** (x = cross, suit = a "suitable" outfit for each target market). Profiles: Western, China, Hybrid. "Cross-Market UX Lens" is only a descriptive subtitle                                                                                                           | 2026-11-09 |
| 8   | Real-user testing                    | Deferred past V1; V1 uses internal before/after evaluation only                                                                                                                                                                                                                      | 2026-11-09 |
| 9   | Evidence standard                    | Every rule needs a rationale, located sources from `rules/sources.json`, stated gaps; moderate/strong need a real study or review; hypotheses need a validation plan. Audit: `docs/07-evidence-audit.md`                                                                             | 2026-11-09 |
| 10  | No unjustified styling in the engine | The engine ships with an empty effect catalog; concrete CSS values are added in B4 only with evidence behind each                                                                                                                                                                    | 2026-11-09 |
| 11  | Engine safety design                 | All page changes go through a journal (fully reversible); one namespaced style element; protected areas (incl. containers holding them) are skipped; loop guard stops runaway re-application                                                                                         | 2026-11-09 |
| 12  | Effect catalog                       | Concrete CSS lives in `rules/effects.json`, each effect with basis and constraints; direction from evidence, magnitude is a modest design choice tuned in B8; forbidden properties (colour, opacity, display, font-size, etc.) enforced by tests; hypotheses get no invented effects | 2026-11-09 |
| 13  | Adapters are drafts                  | Google and Baidu adapters use selectors from general knowledge, not verified on the live DOM; status stays "draft" until verified in B5/B8                                                                                                                                           | 2026-11-09 |
| 14  | Source verification                  | NN/G 2016 verified against the primary text (small study, n=12; the claim about Western preference for simplicity was NOT supported and was corrected). Li 2022 and Li 2026 not yet verified (publisher sites; bot-protection circumvention was refused, so manual check needed)     | 2026-11-09 |
| 15  | Re-plan approved                     | Builds B5–B11 as in `08-scope-review-and-replan.md`; "measure first, apply only the delta" approach                                                                                                                                                                                  | 2026-11-09 |
| 16  | Per-site opt-in                      | No access to any site by default. xsuit runs automatically only on sites the user enabled (optional host permission); elsewhere only on click (activeTab). Replaces the "excluded sites" list. Reason: minimal permissions                                                           | 2026-11-09 |
| 17  | Page metrics                         | Own operationalisation of the study indicators; definitions exported in every file; approximate metrics are labelled; size-based metrics are null when there is no layout; measurement is always of the original page; numbers only, no page text or query string                    | 2026-11-09 |
| 18  | China-oriented e-commerce reference  | Taobao (JD.com as fallback if login walls make Taobao impractical). Alibaba.com stays only as a secondary case, labelled as the international B2B site                                                                                                                               | 2026-11-09 |

## Decided: test and reference sites (answer to former open #1)

| Category                         | Western                    | Chinese                              |
| -------------------------------- | -------------------------- | ------------------------------------ |
| Search                           | Google                     | Baidu                                |
| E-commerce                       | Amazon                     | Alibaba                              |
| Editorial / entertainment portal | BBC                        | A Chinese entertainment site (TBD)   |
| News                             | The Guardian               | A non-state-run Chinese outlet (TBD) |
| Social / content platform        | YouTube, Reddit, Instagram | Weibo, WeChat, RED (Xiaohongshu)     |

Notes:

- The study set is wider than the V1 adapter set. Which sites get a working adapter in V1 is to be narrowed in B1/B4 (each adapter is costly).
- Several Chinese platforms (WeChat, RED, Weibo) are login-gated or app-first; the practical way to study them (screenshots, public pages, web versions) is to be settled when B5/B6 start.
- Two TBD sites (Chinese entertainment, non-state-run news) to be picked later.

## Still open

None. All initial decisions are made.
