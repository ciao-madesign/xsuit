# Verifying an adapter (needs a normal browser; ~15 minutes per site)

Adapters are **optional hints** (decision #48). xsuit works without them; a draft adapter never overrides generic recognition. An adapter becomes `"tested"` only with a filled **verification sheet**, and then it wins over generic recognition where its selectors match.

## Steps

1. Copy `research/adapter-verification/template.json` to `research/adapter-verification/<adapter id>.json` (e.g. `site.google.json`).
2. Open the site in Chrome, logged out, desktop size. Note the page type (home, search-results, article, ...). Repeat for each page type you want covered.
3. For each component and **each selector** of the adapter, in DevTools > Console run `document.querySelectorAll("<selector>").length`. Write the count in `found`. Hover the node in Elements: set `confirmed: true` only if it is the intended block and nothing else.
4. Zero results or the wrong block: **remove or fix the selector in the adapter file** (the sheet must list exactly the adapter's selectors, all confirmed).
5. For each `pageTypeHints` entry give a `samplePath` (a plain path such as `/search`, no query string, no personal data) and set `matches: true` only if the pattern matches it.
6. Load xsuit, open Research tools > "Check compatibility": components should be listed, and the "adapter" lines show `agreed` (same block as generic recognition), `tested-used`, `filled-gap`, `conflict` or `no-match`. `conflict` and `no-match` mean the selector needs a look.
7. In the adapter file set `"status": "tested"` and add:
   `"verification": { "checkedOn": "YYYY-MM-DD", "browser": "Chrome 130", "pageTypes": ["home", "search-results"], "sheet": "<adapter id>.json" }` (dates, browser and page types must equal the sheet).
8. Run `npm run adapters` and `npm run check`. Both must pass.

Sites change often: when the "adapter" lines show `no-match` or `conflict` later, set the adapter back to `draft` and re-verify.

Never mark a selector as confirmed without doing steps 3-4.
