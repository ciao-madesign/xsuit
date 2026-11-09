# research/measurements/

Our own observations of real pages (analysis A2 in `docs/08-scope-review-and-replan.md`). They are evidence under decision #9, so they must be collected the same way every time.

## How to collect (needs a PC with Chrome)

1. Load the extension, open the page, wait until it has finished loading. Do not scroll.
2. Window at 1280 px wide (the viewport is recorded in the file).
3. Open the xsuit popup, press **Measure this page**, then **Download JSON**.
4. Save the file here as `<site>/<page-type>__<date>.json`, e.g. `baidu/search-results__2026-11-12.json`.
5. For each site measure three page types where they exist: home, a list or results page, a detail or article page. Use the same search query or comparable content for both sites of a pair.

## Rules

- The measurement is taken on the **original** page: xsuit undoes its own changes before measuring.
- Files contain numbers only: no page text, no query string, no personal data.
- Record anything unusual (login wall, consent banner covering the page, regional redirect) in a `notes.md` next to the files.
- Limits to keep in mind: desktop web only (Chinese services are often app-first); one moment in time; metric definitions are ours (written inside every file under `definitions`) and are approximations of the studies' indicators, not replications of their exact methods.
