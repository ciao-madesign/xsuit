# 11 — Observation sheets

For platforms xsuit cannot reliably measure or adapt (login walls, app-first services: Weibo, WeChat, RED, Instagram, Reddit, and others). They are evidence under decision #9: same method every time, limits stated, no invented data.

## How to fill one (needs a PC with Chrome)

1. Copy `research/observations/template.json` to `research/observations/<platform>/<page-type>__<date>.json`.
2. Fill the header: platform, page type, date, your name, browser, viewport (1280 px recommended), and whether you were logged in.
3. If the page can be measured, run xsuit's **Measure this page** and set `metrics.source` to `xsuit-measurement` and `metrics.file` to the saved file. Otherwise leave `not-measured`.
4. For each of the 8 conventions choose `present`, `absent` or `not-observed`. `not-observed` is always allowed and is better than a guess. When you choose present or absent, write one factual sentence (what you saw, where).
5. List screenshot file names in `screenshots`. **Never keep screenshots with personal data** (names, messages, feeds of real people). Crop or use a test account.
6. In `limits` say what this observation cannot show (one moment, one account, regional version, personalised feed, app version not seen).

## The 8 conventions

| Key                | Look for                                                |
| ------------------ | ------------------------------------------------------- |
| density            | How much content competes for attention above the fold  |
| hierarchy          | One dominant element, or many blocks of similar weight  |
| central-feed       | A feed/discovery stream as the centre of the page       |
| navigation         | Parallel entry points, bottom/side bars, depth of menus |
| media-and-colour   | Image/video prominence, colour intensity                |
| promotions         | Banners, badges, campaign blocks                        |
| social-interaction | Likes, comments, sharing and following placed inline    |
| super-app-features | Payments, mini-programs, services inside the platform   |

These are the descriptive categories used in docs 01 and 02; a sheet records what was seen, not a judgement.

## Rules

- Descriptive only: no claim that a convention is "better".
- One account and one moment are not a sample; say so in `limits`.
- A sheet is valid when `validateObservation` (in `src/research/observation.ts`) returns no problems; tests check every file under `research/observations/` except the template.
