# 12 — Security model (anti-abuse)

xsuit must not be usable for attacks, data theft or abuse. Rules below are **enforced by tests** (`tests/security.test.ts`, run in CI), so a future change cannot quietly break them.

## Principles

1. **No code from outside.** No remote scripts, no `eval`/`Function`, no `innerHTML`/`insertAdjacentHTML`/`document.write`. Strict extension CSP (`script-src 'self'`, no inline).
2. **No network.** No `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, no URLs in code. Nothing leaves the device; exports are local files the user saves.
3. **Least privilege.** Permissions: `storage`, `activeTab`, `scripting`. No site access at install; the user grants one site at a time, **https only**. No `cookies`, `history`, `webRequest`, `downloads`.
4. **Narrow site grants.** Hosts that cover many organizations (`co.uk`, `github.io`, …), IP addresses and malformed names are refused. Stored lists are capped (500).
5. **Pages cannot command the extension.** The page script only answers messages from the extension itself (same id, not from a tab), with a fixed list of message types. Nothing is exposed to web pages (`web_accessible_resources`, `externally_connectable` absent).
6. **Data, not code, drives changes.** Rules/adapters are bundled and validated; CSS effects accept only plain declarations (no `url()`, `@import`, braces, `expression`). Selectors/patterns with unsafe characters are rejected.
7. **Never touch sensitive areas.** Passwords, payment, login, consent, account deletion are protected and skipped.
8. **No bait links.** Shortcuts copy only plain http(s) links: no `javascript:`/`data:`/`blob:`/`file:`, no embedded credentials, nothing inside protected areas, nothing that logs out, deletes, pays, unsubscribes or confirms.
9. **No runaway work.** Loop guard stops the engine if the page keeps changing; guard checks are capped per rule; JSON-LD size is capped.
10. **Reversible and visible.** Every change is journaled and undoable; the on-page label shows when xsuit changed something. Report screenshots are shown only as inline PNG; exported file names are sanitized.

## Dependencies and releases

CI runs `npm audit --omit=dev` (high severity fails). Dev tools are not shipped. Keep dependencies few; review lockfile changes.

## Not covered / to decide

- Compromise of the developer's account or build pipeline (use 2FA, protected branch, signed releases).
- A malicious site that deliberately abuses page-level DOM (xsuit only reads/styles it, but cannot judge intent).
- Reporting channel for vulnerabilities (a `SECURITY.md` with a contact is still needed).
