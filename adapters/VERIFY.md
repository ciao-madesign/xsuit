# Verifying an adapter (needs a normal browser; ~10 minutes per site)

Adapters here are **drafts**: selectors come from general knowledge, not from the live pages.
An adapter may become `"tested"` only after the checks below, with the date and browser noted in its `notes`.

1. Open the site's page in Chrome (logged out; note the page type: home, search, article, ...).
2. Open DevTools > Console and, for each component of the adapter, paste:
   `document.querySelectorAll("<selector>").length`
   (try every selector of that component).
3. A selector passes if it finds the intended block (hover the node in Elements to confirm) and nothing else.
   Zero results or the wrong block = fix or remove the selector.
4. Check the `urlPattern` of each page type against `location.pathname`.
5. Load xsuit, open Research tools > "Check compatibility": the components should be listed as
   recognized "from adapter". Run "Comparison report" and look at the screenshots.
6. Set `"status": "tested"`, record date, browser version and what was checked in `notes`.
   Sites change often: re-verify before relying on an adapter.

Never mark a selector as verified without doing steps 2-3.
