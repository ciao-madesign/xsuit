# research/studies/

User studies (B22). Method and ethics: `docs/24-ux-validation-methodology.md`.

1. Copy `template.json` to `<studyId>.json`, fill the protocol and the **criteria**, and set `registeredOn` **before** the first session.
2. `npm run study -- --assign 12` gives a balanced A/B order.
3. Add one session per participant (pseudonym `P01`…, bands, counts, no names).
4. `npm run study` validates and applies the criteria; `npm run privacy` checks every file before sharing.
