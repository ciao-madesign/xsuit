# 02 — Western–Chinese UX/UI framework: the four levels

> Foundational document. Four standalone reports with a common structure: principles, documented differences, implications, mistakes to avoid, metrics, recommendations.
> Principle: a **common functional core**, adapting presentation, organization, interactions and integrations separately. Differences are tendencies to verify with real users.

## Level 1 — Visual Design

Not "Western minimalism vs Chinese clutter", but different levels of density, hierarchy and simultaneous information. Evidence: 2026 study of 200 homepages (see doc 01) — limited to institutional sites.

| Element | US/EU | Mainland China |
|---|---|---|
| Visual density | Moderate, marked hierarchy and spacing | Higher, more simultaneous blocks |
| Homepage | Few dominant entry points | More categories, shortcuts, feed, promotions |
| Colors | Contained, more desaturated palettes | Vivid colors, strong contrasts |
| Typography | Hierarchy from size, weight, space | More articulated hierarchy, more graphic elements |
| Components | Cards, menus, tabs, modals, CTAs | Cards, feed, banners, shortcuts, QR, badges, promo modules |
| Animation | Subordinate to content | More prominent role |
| QR code | Functional, not central | Frequent entry to services and content |

**Grids.** US/EU: header → hero → priority CTAs → secondary sections → footer; limits visual competition. China: several autonomous areas (header with search/account → categories and shortcuts → banners → feed → service blocks → promotions); hierarchy is *distributed* across modules, not absent.

**Color and typography.** Localize, don't translate. Red is frequent in the Chinese sample but must not be automatically the main color; blue is common to both. Typography: full Simplified Chinese support, reliable font fallbacks, different text length/density, adequate sizes and line-height, layouts that do not depend on fixed-length text.

**Components to plan:** header (selective / search+account+categories+shortcuts), card (concise / dense), banner (limited / frequent), feed (separate / central), badge (status / status+offers+ranking), QR code (specific / service entry), CTA (few / more actions).

**Recommendations.** One design system with configurable parameters, not two independent ones. Configurable tokens: grid density, spacing, card size/ratio, column count, type hierarchy, palette and saturation, CTA prominence, banner/feed behavior, breakpoints and mobile navigation. The "Chinese" version is not the Western one squeezed onto mobile.

**Mistakes:** raising density indiscriminately; red+gold stereotype; removing white space without reason; translating without checking the grid; confusing component count with UX quality; neglecting accessibility, contrast, focus, semantics.

**Metrics:** visual hierarchy recognition, time to first action, CTA discoverability, content density, visual clutter, readability, responsive consistency.

## Level 2 — Information Architecture

The difference to explore is the mental model by which users reach a service. US/EU: from a function/category/goal. China: also via search, feed, recommendations, account, QR, other services. Tendencies, not all users.

**Models.** Western: by function (Homepage → Search / Categories / Account). Chinese: multiple entry points (Homepage/Super-app → Search, Services, Feed, QR, Community, Marketplace); same service reachable from multiple contexts.

**Homepage and navigation.**
- US/EU: stable menu, categories by function, predictable paths, search for known content, breadcrumbs and contextual links, separation of editorial/services/account.
- China: homepage combining navigation, feed, services; quick access to frequent functions; simultaneous categories and promotions; more recommended content; links between services; search for both finding and discovering.
- Literature distinguishes independent areas vs organization around a focal point: a historical model to verify on current platforms.

**Search: two functions.** *Known-item* (I know what I want) and *exploratory* (I want to discover). Do not design a single system for all cases. For China also consider search inside WeChat, Douyin, Xiaohongshu, Taobao, Baidu: ecosystems, not alternative web engines.

**Recommended three-layer architecture.**
1. *Core taxonomy*: categories, entities, content, relations — market-independent.
2. *Access layer*: menus, search, feed, recommendations, contextual links, QR, external services.
3. *Presentation layer*: focused vs exploratory navigation, modular homepage, personalized feeds, shortcuts.

**Mistakes:** same homepage in both markets; search hidden in deep categories; confusing taxonomy and menu; categories based on translation only; not distinguishing internal/external search; feed as the only way to find information; personalization that hides important content.

**Metrics:** findability, navigation depth, search success rate, search refinement rate, direct access rate, content discovery, information scent.

## Level 3 — Interaction Design

Differences emerge in **complete flows**, not single buttons.

**Onboarding.** US/EU: service intro → sign-up/login → preferences → permissions → main function; often progressive. China: can start from an account already authenticated in an ecosystem, from a QR, or from an integrated service (e.g. a Mini Program in WeChat with no app install).

**Authentication.**

| Method | US/EU | China |
|---|---|---|
| Email and password | Very common | Available, not always a priority |
| Social login | Google, Apple, others | WeChat and local platforms |
| Phone number | Frequent | Very relevant |
| SMS OTP | Common | Common |
| QR login | In some services | Important in desktop/mobile flows |
| Passkey | Growing | To assess per platform |

Do not assume every Chinese user wants/can use WeChat.

**Checkout.** West: search/selection → product page and reviews → cart → address/shipping → payment → confirmation. China: feed/search/creator/marketplace → content/review/live → selection → integrated purchase or quick checkout → local wallet → confirmation and after-sales. The latter is typical of social/live commerce but not mandatory.

**Permissions, privacy, consent** (do not sacrifice to replicate local flows): EU — GDPR, transparency, purposes, legal basis, EDPB dark-pattern guidelines. China — necessity and collection limitation; refusing non-necessary data must not block basic functions. US — federal/state laws, FTC, sectoral obligations.

**Recommendations.** Configurable flows for onboarding, registration, login/recovery, authorization, selection/purchase, payment, confirmation, returns/refunds, preferences, account deletion. The backend keeps consistent state regardless of access/payment method (same transactional object).

**Mistakes:** mandatory external account; assuming WeChat Pay for all; unadapted Western checkout; permissions asked too early; consent hard to refuse/revoke; unhandled payment interruptions; confusing authentication, authorization and payment.

**Metrics:** onboarding completion, login success rate, authentication time, checkout completion, payment failure rate, abandonment rate, permission acceptance, recovery success.

## Level 4 — Digital Ecosystem Integration

Relationship with external services: search engines, social, marketplaces, payments, authentication, APIs, local services. This level shows why translation alone is not enough.

**West:** Google (search, maps, account, ads), Bing (search, Copilot), YouTube, Instagram, Amazon, Apple (account, wallet), Microsoft. Integrated ecosystems exist, but search/communication/purchase/payment/account often stay distributed.

**China:** WeChat/Weixin (messaging, payments, Official Accounts, Mini Programs, search), Alipay, Baidu, Douyin, Xiaohongshu/RedNote, Taobao. Key difference: a platform as access point to many services.

**Mini Programs:** see doc 01 (advantages and limits).

**Integration modules:**

| Module | US/EU | China |
|---|---|---|
| Search | Google/Bing, SEO | Baidu, in-platform search |
| Identity | Email, Google, Apple, passkey | Phone, WeChat, local accounts |
| Payments | Cards, PayPal, Apple/Google Pay | Alipay, WeChat Pay |
| Social | Meta, YouTube, Reddit | WeChat, Douyin, Xiaohongshu |
| Commerce | Amazon, local marketplaces | Taobao, Tmall, JD.com |
| Analytics | Compliant tools | Local tools and local compliance |
| Hosting/CDN | Global providers | Infrastructure meeting local requirements |
| Content | Common CMS and APIs | Local channels and formats |

Not all needed: depends on sector, product, business model.

**Technical/regulatory checks for China:** availability for foreign operators; business registration and verification; app approval; personal data; international transfer; local hosting; developer accounts and payments. PIPL and CAC rules to be considered together with GDPR.

**Mistakes:** Baidu = Google copy; WeChat as messaging only; wallet without an authorization flow; global APIs unavailable in China; transferring data without assessing requirements; depending on a single platform; confusing social presence with technical integration.

**Metrics:** integration coverage, API reliability, authentication interoperability, payment success rate, platform dependency, acquisition channel coverage, data residency compliance, integration maintenance cost.

## Summary: linking the four levels

| Level | Shared | Localizable |
|---|---|---|
| Visual Design | Design tokens, accessibility, base components | Grids, density, colors, hierarchy, composition |
| Information Architecture | Taxonomy, content, relations, metadata | Menus, homepage, categories, feed, search |
| Interaction Design | Business logic, states, validation, security | Onboarding, login, checkout, payments, navigation |
| Ecosystem Integration | Internal APIs, data model, orchestration | Local providers, platforms, services, APIs, infrastructure |

**Implementation priorities:** (1) market-independent core; (2) configurable design system; (3) separate taxonomy and navigation; (4) configurable flows; (5) adapters for local providers; (6) tests with real users of each market.

**Methodological note:** the strongest evidence concerns visual differences. For IA, Interaction and Ecosystem Integration the conclusions partly derive from platform analysis and official documentation, not controlled experiments. US and EU are not homogeneous; China also varies by sector, age, device, platform. Final validation needs separate tests per market and product category.
