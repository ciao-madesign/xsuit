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

## Adapters are hints (changed in B14, decision #48)

Generic recognition comes first. A **tested** adapter (verified on the real site, sheet in `research/adapter-verification/`) wins where its selectors match, and its page-type hint wins. A **draft** adapter never overrides: it can confirm a generic result (a weak one rises to medium), or fill a gap with low confidence only; if it disagrees, the generic result is kept. Draft page-type hints are used only when the generic classifier says "any". What each adapter component did on a page (`agreed`, `tested-used`, `filled-gap`, `conflict`, `no-match`) is reported in the research tools, so selector drift is visible. Adapter files are validated strictly (no over-broad selectors, capped sizes, no slow patterns, no shared-suffix hosts).

## Fallback when unsure (changed in B7, per decision #28)

For actions on specific components: not recognized → skip. Low confidence → skip, unless the rule is a visual rule that explicitly allows `visual-only`. Structural rules never run on low-confidence components. Before B7, "skip" rules wrongly still ran at low confidence; fixed. Consequence: the draft Baidu hot-search selector (low confidence) no longer triggers `visual.china.discovery-feed`.

## Measured without adapters (B13)

On 34 varied synthetic pages the generic analyzer is measured with no adapter; results in `16-generality-report.md`, thresholds enforced in CI. Adapters are optional hints, never required.

## Known limits

- Desktop web only. Since B16 open shadow roots are searched (and closed ones where the browser allows); frames are never read for recognition or changed. See `18-dynamic-pages.md`.
- Signals are generic web conventions, not market-specific; they work the same for Western and Chinese sites, but Chinese sites often skip semantic tags, so expect more "not recognized" there.
- Thresholds (100 words, 3 links, 200 px) are simple design choices, to be reviewed against real pages in B11.
