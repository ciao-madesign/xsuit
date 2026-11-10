# HANDOFF

Read this first in a fresh session, then `docs/05-decisions.md` and `docs/06-builds.md`.

## What the project is

A browser extension (Chrome, TypeScript, MV3) that adapts a web page's UX to the conventions of a target market (V1: Western-oriented vs China-oriented), reversibly and locally, driven by declarative rules. Full context: docs 01–04.

## State (2026-11-10)

- Repo `ciao-madesign/xsuit`, working branch `claude/loving-hopper-lif32i` (contains B0–B11 plus security hardening and B11b/B12). Earlier work was on `claude/great-curie-8yfsjr`, now merged.
- Built: rule system, engine with rollback and loop guard, recognition (analyzer + adapters), accessibility guard, on-page label, comparison report, Hybrid editor, observation sheets, measurement tools, replication check.
- Anti-misuse (adapters/rules cannot be used to steer clicks or disguise pages) is in `docs/14-security-model.md`, tested in `tests/attacks.test.ts`; rule/adapter data is hash-locked (`npm run lock` after a reviewed change).
- Security and privacy are enforced by tests (`tests/security.test.ts`, `tests/privacy.test.ts`); model in `docs/14-security-model.md`, policy in `SECURITY.md`.
- Measurement files (`xsuit.metrics/2`) hold numbers, host, page type and language only; no URL path.
- Not validated: adapters on real sites, replication on real measurements, behaviour with real users, Li 2022 / Li 2026 / WCAG 2.2 primary texts (see `rules/sources.json`, `attempts`).
- Plan: `docs/15-build-plan.md`. B12, B13, B15, B16, B17, B18, B19, B20 and the automatic part of B14 done. **Remaining in B14 needs a person with Chrome:** verify adapters (`adapters/VERIFY.md`) and measure real pages (`docs/13-pc-guide.md`). Next automatic build: B21 (cross-browser). New in B20: `docs/22-language-typography-responsive.md`; person task: native review of adapted Arabic/Hebrew/CJK pages and of any translated labels.

## How the user wants to work

- Short, concise, non-technical replies unless asked. User writes in Italian; the project is in English.
- Propose open decisions **one at a time**, wait for the answer, record it in `docs/05-decisions.md`.
- No PR unless explicitly requested. Commit and push to `claude/loving-hopper-lif32i`.

## Standing rule from the user

Every intervention must be motivated and justified; every rule must be traceable to real studies or to observations/data, with stated limits. Never invent citations. Source registry: `rules/sources.json`; audit: `docs/07-evidence-audit.md`. Primary texts are not yet re-verified (flag `verified:false`).

## Standing rule: validate choices (decision #25)

Before building, propose each design choice (options + recommendation) and ask the user to validate; record in `05-decisions.md`.

## Standing product rule (decision #21)

V1 targets IX researchers, but the final product is a simple public toggle that personalizes the experience, with advanced settings. Researcher tools are a collapsed sub-section. Say which UI layer every new feature belongs to; defaults must work for non-experts.

## Standing requirement: any site

Adapters are optional hints. xsuit must work (or safely do nothing) on any site; rules speak about components, never site names.

## Next steps

1. B20 per `docs/15-build-plan.md` (B14 real-site checks and the B15 keyboard/screen-reader pass in parallel, by a person). Li 2022 / Li 2026 remain unverified (WCAG 2.2 was read on 2026-11-10); Sage and IEEE need a person.
2. Evidence track (needs the user's PC): measurements, `npm run replication`, adapter verification (`adapters/VERIFY.md`), verify Li 2022/2026 and WCAG 2.2 by hand. Do not spoof user agents.
3. Not testable headless: permission prompt, toolbar popup click.

Commands: `npm run check`, `npm run evidence`, `npm run validate:browser`, `npm run replication`.
