# adapters/

Optional per-site hints (hosts, page-type hints, component selectors). xsuit works on any site without them (see `docs/16-generality-report.md`).

- `draft`: written from general knowledge, **not verified** on the real site. Never overrides generic recognition; low confidence when alone.
- `tested`: verified by a person with a sheet in `research/adapter-verification/` (see `VERIFY.md`). Wins where its selectors match.

`npm run adapters` lists every adapter and checks consistency.
