# 05 — Decisions log

| # | Decision | Choice | Date |
|---|---|---|---|
| 1 | Primary V1 user | UX designer / researcher | 2026-11-09 |
| 2 | MVP test sites | Well-known Western sites, one per category (search, e-commerce, editorial portal, content platform); exact sites TBD (see open #1) | 2026-11-09 |
| 3 | Tech stack | TypeScript + Chrome Manifest V3, no heavy frontend framework | 2026-11-09 |
| 4 | Language | Everything in English (documents, code, extension UI) | 2026-11-09 |
| 5 | Work method | Open decisions are proposed one at a time; work proceeds in builds B0–B8 (`06-builds.md`) | 2026-11-09 |

## Still open (ask one at a time, in this order)
1. Exact 4 test sites. Proposal: Google (search), Amazon (e-commerce), BBC or The Guardian (editorial portal), YouTube or Reddit (content platform).
2. Rule data format and location in the repo. Proposal: declarative JSON files, one set per profile, under `rules/`.
3. Project and profile display names.
4. Role of real-user testing in V1. Proposal: defer; internal before/after evaluation only.
