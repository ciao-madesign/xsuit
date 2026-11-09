# HANDOFF

Read this first in a fresh session, then `docs/05-decisions.md` and `docs/06-builds.md`.

## What the project is

A browser extension (Chrome, TypeScript, MV3) that adapts a web page's UX to the conventions of a target market (V1: Western-oriented vs China-oriented), reversibly and locally, driven by declarative rules. Full context: docs 01–04.

## State (2026-11-09)

- Repo `ciao-madesign/xsuit`, branch `claude/great-curie-8yfsjr`. Only documentation exists; B0 done (scaffold + toolchain).
- Docs 01–06 written in English. README lists the reading order.
- Decisions made: user = UX designer/researcher; stack = TypeScript + Chrome MV3; everything in English; sites = paired Western + Chinese set (Google/Baidu, Amazon/Alibaba, BBC/Chinese entertainment, Guardian/non-state Chinese news, YouTube-Reddit-Instagram/Weibo-WeChat-RED); see `05-decisions.md`.
- Build plan B0–B8 defined in `docs/06-builds.md`. B0-B5 complete; B6 next (new plan in doc 08).

## How the user wants to work

- Short, concise, non-technical replies unless asked. User writes in Italian; the project is in English.
- Propose open decisions **one at a time**, wait for the answer, record it in `docs/05-decisions.md`.
- No PR unless explicitly requested. Commit and push to `claude/great-curie-8yfsjr`.

## Standing rule from the user

Every intervention must be motivated and justified; every rule must be traceable to real studies or to observations/data, with stated limits. Never invent citations. Source registry: `rules/sources.json`; audit: `docs/07-evidence-audit.md`. Primary texts are not yet re-verified (flag `verified:false`).

## Next steps

1. B5 is done. Ask the remaining decisions from `08` section 7, one at a time: (2) done: Taobao (decision #18), (3) Bilibili + Caixin as the TBD sites, (4) optional features in or out.
2. Then start **B6 (Delta-based rules)**: metric conditions in the rule vocabulary, provisional profile baselines, density/spacing rules made delta-based.
3. Evidence track (needs the user's PC): verify li2022 / li2026; collect measurements per `research/measurements/README.md`. Do not spoof user agents.
4. Not testable headless: the browser permission prompt for "Always on this site" and the toolbar popup click (activeTab). Everything behind them was tested in real Chromium with a test build limited to localhost.

Commands: `npm run check`, `npm run evidence`.
B5 delivered: `src/metrics/` (20 indicators), popup "Measure this page" + "Download JSON" + "Apply now" + "Always on this site", per-site opt-in permissions, `research/measurements/`; 90 tests.
