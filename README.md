# xsuit

_A suitable UX outfit for every target market._

xsuit is a Chrome extension (Manifest V3, TypeScript) that adapts the interface of a web page to the conventions of a target market, **locally, reversibly and only where it is safe to do so**. Changes are driven by declarative rules, each traceable to a study or an observation with its stated limits.

> Status: research prototype (0.x). The engine, recognition, transparency tools and measurement tools exist and are tested on synthetic pages. Results on real sites and with real users are **not yet validated** (see [docs/12-validation-report.md](docs/12-validation-report.md)).

## Principles

- **Local and private.** No network requests, no remote code, no data leaves the device. Site access is granted one site at a time, https only.
- **Reversible and visible.** Every change can be undone; an on-page label shows when xsuit changed something and why.
- **Safe by default.** Passwords, payments, login and consent areas are never touched. An accessibility guard undoes a rule that makes a page measurably worse.
- **Evidence first.** Rules carry an evidence level and sources ([docs/07-evidence-audit.md](docs/07-evidence-audit.md)). Hypotheses are labelled as hypotheses.
- **Not tied to specific sites.** Recognition is generic first; site adapters are optional hints.

## Quick start

```bash
npm ci
npm run check      # typecheck, lint, format, tests, build
```

Then load the `dist/` folder as an unpacked extension in Chrome (`chrome://extensions`, Developer mode). Other commands: `npm run evidence` (regenerates the evidence audit), `npm run corpus` (recognition report on pages without adapters), `npm run adapters` (adapter status and checks), `npm run replication` (checks measurements against the study), `npm run validate:browser` (real-Chromium checks).

## Where to read

| Need                          | File                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Current state, next steps     | [docs/HANDOFF.md](docs/HANDOFF.md)                                                 |
| Full reading order            | [docs/README.md](docs/README.md)                                                   |
| Build plan                    | [docs/15-build-plan.md](docs/15-build-plan.md)                                     |
| Security model, vulnerability | [docs/14-security-model.md](docs/14-security-model.md), [SECURITY.md](SECURITY.md) |
| Measuring on a PC             | [docs/13-pc-guide.md](docs/13-pc-guide.md)                                         |

## Layout

`src/` extension code · `rules/` market rules, effects, sources · `adapters/` optional per-site hints · `schemas/` JSON schemas · `research/` measurements and observation sheets · `tests/` · `docs/`.
