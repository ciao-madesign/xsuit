# 23 — Cross-browser (B21)

xsuit is written once. One source manifest (`public/manifest.json`, for Chrome) is turned into three builds by small, listed changes (`scripts/targets.mjs`).

| Target  | Command                 | Folder         | Differences from the source manifest                                                                                                                  |
| ------- | ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome  | `npm run build`         | `dist`         | none                                                                                                                                                  |
| Edge    | `npm run build:edge`    | `dist-edge`    | none (Edge is Chromium: same manifest, own folder and package)                                                                                        |
| Firefox | `npm run build:firefox` | `dist-firefox` | background is an event page (`scripts`) instead of a service worker; no `minimum_chrome_version`; `browser_specific_settings.gecko` added (see below) |
| all     | `npm run build:all`     |                | `npm run check` builds all three                                                                                                                      |

## Firefox settings

- `id`: fixed in `scripts/targets.mjs`. **An extension id cannot change after the first publication**: the owner must confirm or replace it before the first upload.
- `data_collection_permissions: { required: ["none"] }`: xsuit collects and transmits nothing. Mozilla requires this declaration for new extensions submitted from 3 November 2025 (MDN, `browser_specific_settings`).
- `strict_min_version: "140.0"`: the version MDN uses in its own example; a conservative choice, not a measured minimum. Lower it only after a smoke test.

## What was checked against the documentation (MDN, 2026-11-10)

- `background` may hold `service_worker`, `scripts` or both; browsers that use event pages use `scripts`.
- `scripting.registerContentScripts` is available in Manifest V3 on Firefox (from 101).
- `tabs.captureVisibleTab` works with `activeTab` on Firefox from 126.
- Optional host permissions: the user can grant and revoke them in the Firefox add-ons manager, and `permissions.getAll`, `onAdded` and `onRemoved` report it. xsuit already asks for site access only on demand.
- Extension-page CSP: only `script-src` and `worker-src` are restricted (to `'self'`, `'none'`, `'wasm-unsafe-eval'`); `object-src` is optional in Firefox. xsuit's policy fits both.

Not verified (no source read): the exact Firefox version for each API, `storage.session`, and `chrome.*` promise behaviour in Firefox. These are in the smoke test.

## Security invariants (same on every target)

A test compares the build of each target with the source: permissions (`storage`, `activeTab`, `scripting`), no `host_permissions`, no `content_scripts`, optional site access `https://*/*` only, the same CSP (no unsafe values, no remote sources), no `web_accessible_resources`, and no `eval`, `new Function` or `importScripts` in any built file. Only the keys named in the table may differ.

## Feature checks

`src/shared/features.ts` lists every browser API xsuit uses.

- **Required** (storage, messaging, tabs, scripting, permissions): if one is missing the background says so in the console and xsuit does not act.
- **Optional** (`storage.session`, `tabs.captureVisibleTab`, `permissions.onAdded/onRemoved`): without one, that feature is skipped (a report without screenshots, no automatic site-list sync) and nothing else changes.
- A test fails if the source uses a `chrome.*` API that is not on the list.

## Smoke test by a person (not done)

Each browser needs one manual pass; only Chrome is exercised automatically (`npm run validate:browser`, real Chromium).

1. **Firefox**: `about:debugging` → This Firefox → Load Temporary Add-on → `dist-firefox/manifest.json`. Grant a site, open a page, apply a profile, open "Why?", restore, build the comparison report (with and without screenshots), turn the site off.
2. **Edge**: `edge://extensions` → Developer mode → Load unpacked → `dist-edge`. Same steps.
3. Note the browser versions and anything that differs. Write results under `research/validation/`.

## Limits

Safari and Opera are not built. Firefox on Android and mobile browsers are out of scope (desktop web only, doc 08). Store packaging (zip, listings, review) is not part of this build.
