# HANDOFF

Read this first in a fresh session, then `docs/05-decisions.md` and `docs/06-builds.md`.

## What the project is
A browser extension (Chrome, TypeScript, MV3) that adapts a web page's UX to the conventions of a target market (V1: Western-oriented vs China-oriented), reversibly and locally, driven by declarative rules. Full context: docs 01–04.

## State (2026-11-09)
- Repo `ciao-madesign/xsuit`, branch `claude/great-curie-8yfsjr`. Only documentation exists; **no code yet**.
- Docs 01–06 written in English. README lists the reading order.
- Decisions made: user = UX designer/researcher; stack = TypeScript + Chrome MV3; everything in English; sites = well-known Western sites (exact list open).
- Build plan B0–B8 defined in `docs/06-builds.md`. Nothing started.

## How the user wants to work
- Short, concise, non-technical replies unless asked. User writes in Italian; the project is in English.
- Propose open decisions **one at a time**, wait for the answer, record it in `docs/05-decisions.md`.
- No PR unless explicitly requested. Commit and push to `claude/great-curie-8yfsjr`.

## Next steps
1. Ask open decision #1 (the 4 test sites), then #2, #3, #4 — one per turn.
2. Record each answer in `docs/05-decisions.md`.
3. Start **B0 (Project foundations)** once the user says go.
