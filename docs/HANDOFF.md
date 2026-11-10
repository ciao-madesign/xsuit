# HANDOFF

Read this first in a fresh session, then `docs/05-decisions.md` and `docs/06-builds.md`.

## What the project is

A browser extension (Chrome, TypeScript, MV3) that adapts a web page's UX to the conventions of a target market (V1: Western-oriented vs China-oriented), reversibly and locally, driven by declarative rules. Full context: docs 01–04.

## State (2026-11-09)

- Repo `ciao-madesign/xsuit`, branch `claude/great-curie-8yfsjr`. Only documentation exists; B0 done (scaffold + toolchain).
- Docs 01–06 written in English. README lists the reading order.
- Decisions made: user = UX designer/researcher; stack = TypeScript + Chrome MV3; everything in English; sites = paired Western + Chinese set (Google/Baidu, Amazon/Alibaba, BBC/Chinese entertainment, Guardian/non-state Chinese news, YouTube-Reddit-Instagram/Weibo-WeChat-RED); see `05-decisions.md`.
- Build plan B0–B8 defined in `docs/06-builds.md`. B0-B8 complete; B9 next (new plan in doc 08).

## How the user wants to work

- Short, concise, non-technical replies unless asked. User writes in Italian; the project is in English.
- Propose open decisions **one at a time**, wait for the answer, record it in `docs/05-decisions.md`.
- No PR unless explicitly requested. Commit and push to `claude/great-curie-8yfsjr`.

## Standing rule from the user

Every intervention must be motivated and justified; every rule must be traceable to real studies or to observations/data, with stated limits. Never invent citations. Source registry: `rules/sources.json`; audit: `docs/07-evidence-audit.md`. Primary texts are not yet re-verified (flag `verified:false`).

## Standing rule: validate choices (decision #25)

Before building, propose each design choice (options + recommendation) and ask the user to validate; record in `05-decisions.md`.

## Standing product rule (decision #21)

V1 targets IX researchers, but the final product is a simple public toggle that personalizes the experience, with advanced settings. Researcher tools are a collapsed sub-section. Say which UI layer every new feature belongs to; defaults must work for non-experts.

## Next steps

1. B8 done (see `docs/10-transparency-and-safety.md`). Ask the user to confirm decision #36 (Undo scope: this page until reload) or change it.
2. Start **B9 (Structural transformations)**: propose design choices one at a time first (decision #25). Structural actions (collapse, reorder, group, surface-shortcut) are currently reported "arrive in build B9". Reversibility and the guard already support per-rule undo.
3. Known: effect magnitudes need tuning (vivid saturation lowers contrast on ~18% of passing pairs in the synthetic simulation); the guard handles it at runtime. Tune in B11 with real data.
4. Evidence track (needs the user's PC): verify li2022 / li2026; collect measurements per `research/measurements/README.md`; replace provisional baselines. Do not spoof user agents.
5. Not testable headless: permission prompt for "Personalize this site", toolbar popup click.

Commands: `npm run check`, `npm run evidence`.
B8 delivered: first-activation style picker, on-page label and panel (`src/ui/`), per-rule switches in options, accessibility guard (`src/engine/a11y.ts`), compatibility indicator in research tools; 147 tests; real Chromium checked.
