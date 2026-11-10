# 19 — Privacy and data governance (B17)

xsuit works on web pages people read, so it is built to keep as little as possible, keep it on the device, and never let anything leave without the person seeing it first. This page is the reference for what exists, why, and the rules for anyone who collects or shares research data.

## 1. What xsuit keeps on the device

| Data                                                                       | Where                                                             | Why                               | Leaves the device?                                                                         | How to remove                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Settings (style, depth, label position, switched-off rules, Hybrid choice) | `chrome.storage.local`                                            | so choices persist                | Never                                                                                      | Options → "Delete all xsuit data"                |
| Sites where xsuit always runs                                              | `chrome.storage.local` and the browser's own site-permission list | so it runs only where you allowed | Never                                                                                      | Same button, or switch the site off in the popup |
| A comparison report in progress, with two screenshots                      | `chrome.storage.session`                                          | to show the report page           | Never; removed the moment the report page has read it, and cleared when the browser closes | automatic                                        |
| The last measurement                                                       | memory of the open popup                                          | to show and, if asked, save it    | Never                                                                                      | closing the popup                                |

xsuit has **no account, no server, no telemetry, no analytics, no network requests** (enforced by tests: no `fetch`, XHR, WebSocket, beacons, no external URLs).

## 2. Research files: what they may contain

A **measurement file** (`xsuit.metrics/2`) and a **report file** (`xsuit.report/2`) are the only things xsuit can write. They are made only when the person presses **Download**, after a **"Check before saving"** box shows a plain summary and the complete text of the file. The text that is saved is the text that was shown. Cancel saves nothing. A file that fails the gate cannot be saved at all.

Allowed fields are fixed by closed JSON Schemas (`schemas/measurement.schema.json`, `schemas/report.schema.json`): any other field makes the file invalid.

| Field                                     | Content                                                                                                                                   | Personal-data risk                                                                                   | Control                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| host                                      | site name, e.g. `example.com`                                                                                                             | Low (a public site). A private, local or unusual address (intranet, IP, single-label) is **refused** | must pass the host rule               |
| pageType                                  | a label such as `home`, `article`                                                                                                         | None                                                                                                 | fixed pattern                         |
| lang                                      | language code such as `en`                                                                                                                | None                                                                                                 | fixed pattern, else empty             |
| viewport, counts, ratios                  | numbers                                                                                                                                   | None                                                                                                 | numbers only                          |
| rule ids, titles, evidence level, reasons | generated by xsuit                                                                                                                        | None                                                                                                 | length cap; scanned for personal data |
| **Never included**                        | page text, titles, links, **URL path, query string, fragment**, form values, images, **screenshots**, cookies, user or device identifiers | —                                                                                                    | schema (closed) + canary tests        |

The **screenshots** shown in the comparison page stay on the device and are not part of any file.

## 3. Observation sheets and adapter verification sheets

These are written by hand by researchers (`research/observations/`, `research/adapter-verification/`).

- Use **initials or a pseudonym** for `observer`. Do not write a name, e-mail, phone, account or handle.
- **Never keep or commit screenshots** that show messages, feeds of real people, names or account data; crop or use a test account.
- Use only logged-out pages or test accounts. Sample paths contain no query string.
- `npm run privacy` (and CI) scan these files and the measurement files and refuse e-mail addresses, phone-like or long numbers, IP addresses, links with a query string or credentials, and secret-looking tokens. This is a safety net: it cannot recognise a name in plain words.

## 4. Consent, sharing and retention

- **Your own data (you are the researcher):** you decide whether to share. Check the saved file; if in doubt, open it and read it (it is plain JSON).
- **Data about other people (a study with participants):** not collected by xsuit. If a study is run (B22), it needs its own consent form, a stated purpose, a retention period, and approval where required. The measurement and report files never contain participant data.
- **Retention:** files are the researcher's. Keep them in the repository only if they pass `npm run privacy`; delete anything that should not be public.
- **Public repository:** everything committed here is public. Treat each commit as publication.

## 5. Legal note (not legal advice)

The files contain no data that identifies a person, which keeps xsuit outside most personal-data rules, but laws differ by country (GDPR in the EU; PIPL in China, see doc 02). Before collecting data **from people**, or running xsuit as a service, get proper advice.

## 6. Rules for developers

1. New data in a file = a new schema version, a closed schema, a gate update, a test that shows page content cannot reach it, and a line in this page.
2. No file leaves without the preview. No `Blob`/download outside `src/pages/exportPreview.ts`.
3. No network, no new permission, no storage of page content, ever. A change to this needs a written decision.
4. Page-derived strings (host, language, page type) are normalised or pattern-checked before they are put in a file.

## 7. Where it lives

`src/research/exportGate.ts` (what can be exported, preview text), `src/research/privacy.ts` (closed gates), `src/research/personal.ts` (scanner), `src/pages/exportPreview.ts` (the "Check before saving" box), `schemas/*.schema.json`, `npm run privacy`. Tests: `tests/b17-privacy.test.ts`, `tests/privacy.test.ts`.
