# Security policy

xsuit runs inside the user's browser and must never be usable for attacks, data theft or abuse. The security model is described in [docs/14-security-model.md](docs/14-security-model.md) and enforced by automated tests (`tests/security.test.ts`).

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub: **Security → Report a vulnerability** on this repository (private vulnerability reporting). If that is not available, contact the maintainers through the profile of the `ciao-madesign` organization.

Include: what you found, steps to reproduce, the affected version and browser, and the impact you expect. Screenshots or a small test page help.

## What to expect

- Acknowledgement within 7 days.
- An initial assessment within 14 days.
- A fix, or a clear explanation of why none is needed, as soon as practical. You will be told before any public disclosure and credited if you wish.

## Scope

In scope: the extension code, its manifest and permissions, build scripts, rules and adapters, exported files.

Examples of issues we want to hear about: a rule, adapter or page that makes xsuit steer users toward a click, hide a warning or disguise a changed page (see the misuse section of the security model), code execution from a web page, a page controlling the extension, data leaving the device, permissions broader than needed, unsafe links or CSS produced by rules/adapters, personal data in exports.

Out of scope: vulnerabilities of the browser itself, of third-party sites xsuit runs on, and social engineering.

## Supported versions

Only the latest released version receives security fixes. The project is pre-1.0.

## Our commitments

No remote code, no network requests, https-only site access granted one site at a time, and every change reversible. A change that weakens these needs an explicit, documented decision.
