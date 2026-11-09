# HANDOFF

Read this first in a fresh session, then `docs/05-decisions.md` and `docs/06-builds.md`.

## What the project is

A browser extension (Chrome, TypeScript, MV3) that adapts a web page's UX to the conventions of a target market (V1: Western-oriented vs China-oriented), reversibly and locally, driven by declarative rules. Full context: docs 01–04.

## State (2026-11-09)

- Repo `ciao-madesign/xsuit`, branch `claude/great-curie-8yfsjr`. Only documentation exists; B0 done (scaffold + toolchain).
- Docs 01–06 written in English. README lists the reading order.
- Decisions made: user = UX designer/researcher; stack = TypeScript + Chrome MV3; everything in English; sites = paired Western + Chinese set (Google/Baidu, Amazon/Alibaba, BBC/Chinese entertainment, Guardian/non-state Chinese news, YouTube-Reddit-Instagram/Weibo-WeChat-RED); see `05-decisions.md`.
- Build plan B0–B8 defined in `docs/06-builds.md`. B0-B4 complete; B5 next.

## How the user wants to work

- Short, concise, non-technical replies unless asked. User writes in Italian; the project is in English.
- Propose open decisions **one at a time**, wait for the answer, record it in `docs/05-decisions.md`.
- No PR unless explicitly requested. Commit and push to `claude/great-curie-8yfsjr`.

## Standing rule from the user

Every intervention must be motivated and justified; every rule must be traceable to real studies or to observations/data, with stated limits. Never invent citations. Source registry: `rules/sources.json`; audit: `docs/07-evidence-audit.md`. Primary texts are not yet re-verified (flag `verified:false`).

## Next steps

1. Start **B5 (Analyzer, semantic mapper, classifier)** when the user says go.
2. Source verification: li2022 and li2026 still unverified (ieeexplore / sagepub). The environment now allows these hosts, but WebFetch cannot resolve them (curl reaches nngroup.com only without spoofing); do NOT spoof user agents. Ask the user to check the figures manually or supply the PDFs.
3. Adapters for Google/Baidu are drafts: verify selectors on live pages when possible (B5/B8).

Commands: `npm run check`, `npm run evidence`.
B4 delivered: `rules/effects.json` + `src/engine/effects.ts`, `adapters/` (google, baidu) + `src/adapters/`, content script uses adapter context; 73 tests; checked in real Chromium with a mapped local page (western / china / original behave correctly).
