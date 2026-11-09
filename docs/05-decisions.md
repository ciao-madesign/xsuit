# 05 — Decisions log

| # | Decision | Choice | Date |
|---|---|---|---|
| 1 | Primary V1 user | UX designer / researcher | 2026-11-09 |
| 2 | MVP test sites | Paired Western and Chinese sites per category, used as reference for both profiles (see list below) | 2026-11-09 |
| 3 | Tech stack | TypeScript + Chrome Manifest V3, no heavy frontend framework | 2026-11-09 |
| 4 | Language | Everything in English (documents, code, extension UI) | 2026-11-09 |
| 5 | Work method | Open decisions are proposed one at a time; work proceeds in builds B0–B8 (`06-builds.md`) | 2026-11-09 |
| 6 | Rule format | Declarative JSON files under `rules/`, one set per profile; data only, never executable code | 2026-11-09 |
| 7 | Names | Project: **xsuit** (x = cross, suit = a "suitable" outfit for each target market). Profiles: Western, China, Hybrid. "Cross-Market UX Lens" is only a descriptive subtitle | 2026-11-09 |
| 8 | Real-user testing | Deferred past V1; V1 uses internal before/after evaluation only | 2026-11-09 |

## Decided: test and reference sites (answer to former open #1)
| Category | Western | Chinese |
|---|---|---|
| Search | Google | Baidu |
| E-commerce | Amazon | Alibaba |
| Editorial / entertainment portal | BBC | A Chinese entertainment site (TBD) |
| News | The Guardian | A non-state-run Chinese outlet (TBD) |
| Social / content platform | YouTube, Reddit, Instagram | Weibo, WeChat, RED (Xiaohongshu) |

Notes:
- The study set is wider than the V1 adapter set. Which sites get a working adapter in V1 is to be narrowed in B1/B4 (each adapter is costly).
- Several Chinese platforms (WeChat, RED, Weibo) are login-gated or app-first; the practical way to study them (screenshots, public pages, web versions) is to be settled when B5/B6 start.
- Two TBD sites (Chinese entertainment, non-state-run news) to be picked later.

## Still open
None. All initial decisions are made.
