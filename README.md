# xsuit

_A suitable UX outfit for every target market._

xsuit is a browser extension for people. Pick the market whose web conventions you are used to, and with one click any page takes that style: spacing, emphasis, navigation and shortcuts the way sites in that market usually do them. One more click and the page is back to the original.

Companies can use it too, to see how their own pages would look when localized for another market.

## What you get

- **One click, fully reversible.** Adapt this page, or go back to the original. Nothing is changed on the site itself.
- **Local and private.** xsuit sends nothing anywhere and collects nothing. Site access is granted one site at a time.
- **Safe.** Passwords, payments, login and consent areas are never touched. If a change would make a page harder to read or use, xsuit undoes it. A small label on the page tells you when xsuit changed something, and why.
- **Works on any site.** It recognizes the parts of a page by itself; per-site settings are only optional hints.
- **Honest about its limits.** Each change comes from a published study, with its limits stated. Two reference markets exist today (Western and Chinese); more need their own sources first.

> Status: version 0.x, before release. It is tested on synthetic pages and in a real browser; it has not yet been tried with users.

## Use

1. Install (store versions are planned; for now see _Build_ below).
2. Open the xsuit icon on a page, choose your market, press the switch.
3. Use "Always on this site" if you want it every time. xsuit then asks for access to that site only.

## Build

```bash
npm ci
npm run check        # typecheck, lint, format, tests, release and developer builds
npm run build        # release build in dist/ (load it unpacked: chrome://extensions, Developer mode)
npm run build:edge   # dist-edge/
npm run build:firefox # dist-firefox/
```

## For developers

The release build is the product. The developer build (`npm run build:dev`, in `dist-dev/`) adds the research tools: measuring pages, the comparison report, export checks. Research data and studies are a developer matter and never part of what users install.

| Need                          | File                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Product direction             | [docs/25-product-replan.md](docs/25-product-replan.md)                             |
| Current state, next steps     | [docs/HANDOFF.md](docs/HANDOFF.md)                                                 |
| Full reading order            | [docs/README.md](docs/README.md)                                                   |
| Security model, vulnerability | [docs/14-security-model.md](docs/14-security-model.md), [SECURITY.md](SECURITY.md) |
| Evidence behind the rules     | [docs/07-evidence-audit.md](docs/07-evidence-audit.md)                             |

Developer commands: `npm run evidence`, `corpus`, `adapters`, `privacy`, `replication`, `study`, `validate:browser`.

## Layout

`src/` extension code · `rules/` market rules, effects, sources · `adapters/` optional per-site hints · `schemas/` JSON schemas · `research/` developer research data · `tests/` · `docs/`.
