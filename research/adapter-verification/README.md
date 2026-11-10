# research/adapter-verification/

One sheet per adapter that was checked on the real site, named `<adapter id>.json` (e.g. `site.google.json`). Copy `template.json`, fill it following `adapters/VERIFY.md`.

An adapter may be set to `"tested"` only when its sheet passes `npm run adapters` and `tests/b14-adapters.test.ts`: every selector found and confirmed, every page-type hint matching its sample, dates and browser equal to the adapter's `verification` record. Sample paths are plain paths (no query string, no personal data).
