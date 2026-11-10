# 09 — Recognition (B7): what is recognized, how, and how sure

Choices validated by the user on 2026-11-10 (decisions #26–#29). Everything here is read-only: the page is never changed by analysis.

## Order of trust

1. HTML semantics and ARIA (tags, roles).
2. Structured data (JSON-LD, microdata, og:type).
3. Very few heuristics, only for simple things (search box, carousel).
4. Unsure → low confidence or nothing → the engine falls back (usually: skips the rule).

## Components

| Component    | Signals                                                                                                                                           | Confidence                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| header       | page-level `<header>` or `role=banner`; +contains nav/search                                                                                      | medium; high with corroboration                                                                                     |
| primary-nav  | `<nav>`/`role=navigation` with 3+ links; +inside header                                                                                           | medium; high inside header                                                                                          |
| search-box   | `role=search`, `input[type=search]` (semantic); input name `q/wd/query/keyword…`, label mentioning search or 搜索 (heuristic)                     | semantic+hint or 2 semantic = high; 1 semantic or 2 hints = medium; 1 hint = low. Heuristics alone never reach high |
| footer       | page-level `<footer>`/`role=contentinfo`; +3 links                                                                                                | medium; high with links                                                                                             |
| sidebar      | `<aside>`/`role=complementary` outside articles                                                                                                   | medium                                                                                                              |
| article-body | `itemprop=articleBody`; `<article>` with heading and 100+ words                                                                                   | medium; high with 2 signals                                                                                         |
| video-player | `<video>` with controls or 200+ px wide                                                                                                           | medium; high with controls                                                                                          |
| carousel     | `aria-roledescription=carousel/slider` (semantic); known widget classes `swiper, slick-slider, carousel, owl-carousel, glide, splide` (heuristic) | ARIA medium, high with prev/next controls; class only = low                                                         |
| product-card | microdata `schema.org/Product`                                                                                                                    | medium                                                                                                              |

**Not recognized generically** (no reliable signal; adapters only): hero, promo-banner, product-grid, filters, recommendations, headline-list, feed-item, comments, ads. Rules on them are skipped on sites without an adapter.

## Page type (two independent signals)

Signal kinds: structured (JSON-LD `@type`, og:type), semantic (article/video elements, Product microdata), url (path words, query parameter **names** only), content (search field repeats the query; compared locally, never stored).
A type is accepted only when two different kinds agree and it is the only such type. Otherwise `any`, so page-type-specific rules do not run. Types handled: article, video, product-detail, product-list, search-results, home.

## Adapter first

Where a site adapter matches a component, its confidence is used; the generic analyzer fills the rest. An adapter page-type hint beats the generic classifier. The `ApplyReply` carries `recognized` (component, confidence, source, signals) and `pageType` for the explain panel (B8).

## Fallback when unsure (changed in B7, per decision #28)

For actions on specific components: not recognized → skip. Low confidence → skip, unless the rule is a visual rule that explicitly allows `visual-only`. Structural rules never run on low-confidence components. Before B7, "skip" rules wrongly still ran at low confidence; fixed. Consequence: the draft Baidu hot-search selector (low confidence) no longer triggers `visual.china.discovery-feed`.

## Known limits

- Desktop web only. Shadow DOM, iframes and closed shadow roots are not searched (listed for the B11 compatibility tests; not yet handled).
- Signals are generic web conventions, not market-specific; they work the same for Western and Chinese sites, but Chinese sites often skip semantic tags, so expect more "not recognized" there.
- Thresholds (100 words, 3 links, 200 px) are simple design choices, to be reviewed against real pages in B11.
