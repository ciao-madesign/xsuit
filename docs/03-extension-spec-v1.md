# 03 — Specification: Cross-Market UX Localization Extension (V1.0)

> Initial specification supplied by the client, content reported in full. Evaluation and proposed adjustments are in doc 04.

**Type:** browser extension · **Category:** UX Adaptation / Web Localization · **Architecture:** modular, local-first, multi-market · **First release:** two market profiles · **Goal:** dynamic, reversible adaptation of the web browsing experience.

**Terminology:** the project does not associate a graphic style with a nationality or group. It speaks of *target market* and *UX configurations adapted* to cultural, linguistic, technological and commercial contexts.

## 1. Vision

### 1.1 Goal
Dynamically adapt a web page's UX/UI to the conventions of different markets, changing not only appearance but: organization and hierarchy of information; layout and behavior of components; navigation and access to features; interaction paths; search and discovery; presentation of content and recommendations; access points to external services; linguistic and technological localization. It differs from theming tools because it acts on structure and behavior.

### 1.2 Long-term vision
A universal UX adaptation engine, multi-browser. V1: Profile A (Western conventions), Profile B (mainland Chinese market conventions). Future: India, Japan, Arab/Middle-Eastern markets, others. Profiles are not national stereotypes but configurations based on evidence, research, tests and real characteristics of local services.

### 1.3 Principles
1. Cultural neutrality. 2. Functional adaptation. 3. Reversibility. 4. Transparency (user knows what is modified). 5. Privacy (local analysis). 6. Compatibility (preserve original functions). 7. Modularity (one profile per market). 8. Evidence-based design. 9. Accessibility (no transformation compromises it). 10. Non-invasiveness (know when not to modify).

## 2. Scope

**Included:** page structure analysis; semantic recognition of components; page type identification; profile selection; visual transformations; reorganizing content and navigation; alternative components and paths; adapting interactive behavior; per-site rules; restoring the original; reporting unsupported transformations.

**Excluded from V1:** full automatic translation; replacing original authentication or payments; automating purchases/transactions; bypassing geographic restrictions; circumventing paywalls/protections; changing access policies; simulating unavailable services; centralized browsing data collection; modifying the original site's data or content. Architecture must allow future integrations where technically and legally possible.

## 3. Adaptation model (4 coordinated levels)

- **L1 Visual Design:** grids/layout, density, spacing, sizes, colors, typography, hierarchy, cards, banners, menus, badges, icons, feed, promotional elements, responsive behavior.
- **L2 Information Architecture:** category hierarchy, menus, homepage, access to search and content, groupings, breadcrumbs, contextual navigation, related content, shortcuts, feed, discovery.
- **L3 Interaction Design:** onboarding, navigation, feature access, search, filters, selection, cards, context menus, purchase paths, modals, notifications, shortcuts, feedback. New interactions must connect to features actually available on the site, without simulating unsupported operations.
- **L4 Digital Ecosystem Integration:** search engines, social, marketplaces, video, authentication, payments, recommendation, APIs, local services, distribution. May: make links to local services more visible, propose compatible alternatives, add shortcuts, integrate authorized connectors, indicate unavailable services. It does **not** replace original APIs, accounts, payments or services.

## 4. Market profiles

**Structure:** each market = an independent *Market Profile* with: id, neutral name, description, language and variants, visual settings, IA rules, Interaction rules, available integrations, compatibility rules, reliability level, references to evidence. No rigid assumptions about individual users.

**Initial:** A — Western-oriented; B — China-oriented (they describe the design context, not users).

**Future:** other Asian markets, South Asia, Middle East, RTL languages, regional/linguistic configurations, hybrid profiles. Adding a profile must not require changes to the engine.

**Hybrid:** an *explicit* composition of rules (not an automatic average): e.g. one profile's density + another's hierarchy + custom navigation + specific flows + selected integrations.

## 5. Software architecture

- **A. Extension Core:** activation, permissions, configuration, inter-module communication, page state, sessions, extension UI.
- **B. Page Analyzer** (local): URL/domain, DOM, semantic elements, interactive components, hierarchy, media, menus, search, forms, cards, CTAs, dynamic content, viewport.
- **C. Semantic Mapper** (heart of the project): recognizes the *function* of elements regardless of HTML implementation. Maps: Header, Navigation, Search, Product Card, Content Card, Primary/Secondary CTA, Filter, Recommendation, Account Area, Footer. Signal preference order: HTML semantics → ARIA → accessible roles/properties → text and structure → known DOM patterns → domain-specific rules. Do not rely solely on fragile CSS selectors.
- **D. Page Classification Engine:** homepage, search, product, marketplace, article, editorial, social feed, video, dashboard, service, form, authentication.
- **E. UX Transformation Engine:** receives semantic structure, page type, profile, adaptation level, user preferences; produces a *transformation plan* applied in a controlled, reversible way.
- **F. Interaction Controller:** links new components to original elements, manages events and state, alternative navigation, synchronization, control of unsupported actions.
- **G. Site Adapter Manager:** per-domain adapters (recognition, mapping, transformations, exceptions, dynamic components, compatibility checks), isolated from the general engine.
- **H. Safety & Rollback Manager:** applied changes, DOM conflicts, JS errors, loss of functionality, original state, restoration.

## 6. Transformation modes

- **Visual:** presentation only (colors, typography, spacing, sizes, grids, density, layout, graphic components). Does not touch functional structure.
- **Structural:** presentation + organization (moving sections, reordering cards, groupings, navigation, shortcuts, new hierarchy, alternative views).
- **Deep:** all of the above + alternative paths, new access points, additional interactive components, flow adaptation, links to compatible external services. Does not authorize replacing security, authentication or payment.

## 7. Transformation engine

**Process:** analyze → identify components → classify page → load profile → find applicable transformations → check dependencies → generate *Transformation Plan* → apply → monitor stability → allow rollback. It is not a predefined CSS sheet.

**Transformation Rule** — fields: id, profile, level, page type, affected components, applicability conditions, action, dependencies, priority, reversibility, risk, fallback. Site-independent when possible.

**Priority (highest first):** 1 security, 2 accessibility, 3 site rules, 4 page-type rules, 5 profile rules, 6 user preferences. On conflict the most specific rule wins, if it does not violate security and accessibility.

**Confidence:** High (clear semantics), Medium (pattern), Low (uncertain). Structural/interactive transformations require adequate confidence; if unsure → non-destructive visual only, or no intervention.

## 8. Dynamic pages

Handle: dynamic updates, SPAs, progressive loading, infinite scroll, feeds, modals, AJAX, components rebuilt by frameworks. Use MutationObserver and navigation detection. Transformations are **idempotent** (same rule not re-applied to the same element) and avoid loops where own changes trigger further changes.

## 9. Interactions

**Principle:** new interactions use original features whenever possible. E.g. a new product card created by the extension, but its buy button calls a verified original action, not a simulated purchase.

**Supported in V1:** open/close panels, expand sections, shortcuts, internal navigation, existing filters, original search, reordering content, show/hide sections, contextual links.

**Protected (never modified autonomously):** passwords, payment data, authorizations, consents, authentication, purchase confirmations, transactions, account deletion, security controls.

## 10. Digital Ecosystem Integration

Distinguish: informational link; link to external service; API integration; external authentication; commercial integration; transactional integration.

**Connector**, independent, declares: service, market, features, authentication requirements, permissions, APIs, limitations, availability status.

**Rules:** no connector activated without consent; no credential collection, personal-data transfer or transactions without explicit authorization; a link to a local service must not be presented as a working integration if the service is unavailable.

## 11. Extension UI

- **Popup:** ON/OFF, market selection, depth, compatibility status, restore, settings.
- **Profile:** A, B, Hybrid, Original (display names customizable in distributed versions).
- **Page status:** analyzed page, recognized components, applied/unavailable transformations, compatibility, problems.
- **Control:** disable all, restore, disable single rules, exclude a domain, choose level, per-domain preferences.

## 12. Technical architecture

JS/TS, HTML/CSS, WebExtensions API, Manifest V3 (Chromium), Firefox compatibility, Safari later. Frontend framework to be evaluated (not needed for prototype). Components: Background Service Worker, Content Scripts, Popup UI, Options Page, Storage Manager, Transformation Engine, Site Adapter Manager.

**Local processing**, no central analysis server; distribution of profiles/rules is separate from page analysis. **Local storage** for: profile, preferences, excluded domains, configuration, transformation state, adapters. Do not store sensitive page content.

## 13. Privacy and security (structural requirement)

Local processing; minimal permissions; explicit activation; no history collection; no content sent out; no password collection; no reading of payment data; no automatic consent changes; no unverified remote code; isolated adapters; immediate restore. External communication only for authorized updates and explicitly activated integrations. Comply with store policies and applicable regulations.

## 14. Compatibility

**Browsers, in order:** Chrome, Edge, Brave, Firefox, Opera, desktop Safari (verify the APIs actually used, don't infer from engine). **Unsupported pages:** browser-internal pages, extension stores, protected pages, some PDF viewers, isolated interfaces, inaccessible cross-origin components. Communicate the limit without unsafe modifications.

## 15. MVP V1

**Goal:** show that an existing web page can be transformed from one UX model to the other, acting on structure, presentation and some interaction paths.

**Scope:** Chrome extension; two profiles; preliminary Hybrid; manual activation; local DOM analysis; semantic recognition of main components; page type classification; Visual; Structural; first non-destructive alternative interactions; restore; per-domain configuration; compatibility indicator.

**Initial sites (few types):** search engine; e-commerce; editorial portal; social/content platform.

**Acceptance criteria:** recognizes main elements of tested pages; applies both profiles; changes visual hierarchy; reorganizes some sections; adds at least one working alternative path; keeps original functions working; does not modify data/transactions; full restore; no page data sent to external servers.

## 16. Roadmap

0. Research and design (profiles, real examples, rules, test sites, architecture). 1. Technical prototype (extension, DOM reading, Semantic Mapper, CSS, restore). 2. Structural (reordering, menus, groupings, shortcuts). 3. Deep Interaction (paths, components, state, site adapters). 4. Ecosystem Integration (connectors, local services, discovery, authorized integrations). 5. Market expansion (new profiles, RTL, new languages/scripts, new providers).

## 17. Testing and validation

| Area | Metric |
|---|---|
| Recognition | Semantic Mapper precision |
| Visual | Hierarchy consistency |
| IA | Findability |
| Interaction | Task completion |
| Performance | Transformation time |
| Stability | DOM and JS errors |
| Compatibility | % of pages supported |
| Reversibility | Rollback success |
| Privacy | Data transmitted externally |
| Accessibility | Accessibility requirements maintained |

Tests with users of the reference markets, not only internal evaluation.

## 18. Technical risks

| Risk | Mitigation |
|---|---|
| Complex DOM | Semantic Mapper and Site Adapter |
| Dynamic sites | Controlled change monitoring |
| Unrecognized components | Conservative fallback |
| Broken interactions | Interaction Controller and tests |
| CSS conflicts | Namespacing and isolation |
| Site updates | Regression tests |
| Provider dependency | Modular connectors |
| Excess complexity | Progressive MVP |
| Irreversible changes | Snapshot and rollback |
| False recognition | Confidence levels |

## 19. Future direction

From a personalization extension to a UX compatibility engine across digital contexts: additional market profiles; automatic page-type detection; profile suggestion; visual rule editor; community adapters; public Market Profile repository; original/adapted comparison; test mode for UX designers and researchers; comparative site analysis; API to embed the engine in other tools.

## 20. Closing principle

The project must not turn a site into a visual caricature of another market, but make it more compatible with different conventions of design, information organization and interaction, keeping content and core functions unchanged. **One page, multiple ways of experiencing it, without imposing a single cultural UX model.**

## Additional design guidance (from the client)

1. **Separate market profile from language**: an English page may need adaptation for another context; Chinese translation alone is not UX localization.
2. **Don't leave everything to AI**: recognition may use models, but transformations are governed by verifiable, reversible rules.
3. **Build a verified transformation archive**: each rule with examples, applicability conditions, limits and test results.

**First concrete activity:** define the *Transformation Rule System*, the core that lets markets be added without rewriting the extension.
