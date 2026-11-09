# 01 — Research: UX/UI differences between Western (US/EU) and Chinese markets

> Foundational document. Revised November 2026. Source: research report supplied by the client.
> The differences observed are **tendencies to validate with real users**, not universal cultural rules.

## 1. Scope

- Two market models only: **Western** (US + EU) and **Chinese** (mainland China and its digital ecosystem).
- Japan is excluded from comparison and conclusions.
- US and EU are grouped for shared UX conventions; regulatory, commercial and technological differences are called out where relevant.

**Goal:** understand whether and how the design of a digital product changes for the two markets, covering: interface composition, information hierarchy and density, information architecture, navigation and flows, search and discovery, registration/authentication, e-commerce and payments, social and integrated services, personalization, privacy/security/regulation.

**Fundamental distinction** (do not conflate):
1. **cultural** differences;
2. **ecosystem** differences;
3. **regulatory** differences.

Example: a feature common in China may depend on the structure of local platforms, not on a cultural preference.

## 2. Findings from comparative studies

### 2.1 Literature review (Li, Karreman, de Jong, 2022)
*Cultural Differences in Web Design on Chinese and Western Websites* — 17 comparative studies.
- Chinese sites: more elements and interactions; more red and blue.
- Western sites: more white space, underlined links, articulated footers.
- Limit: definitions and methods are not uniform → not universally proven.

### 2.2 2026 study — 200 municipal homepages (Li, Karreman, de Jong, 17 June 2026)
*Cross-Cultural Design: Comparing the Visual Characteristics of Chinese and Western Municipal Websites.* 100 Chinese vs 100 Western homepages.

| Indicator | China | West |
|---|---|---|
| Image diversity (mean) | 6.32 | 4.34 |
| Visual density (images/videos per 1,000 px) | 38.21 | 12.87 |
| Main content blocks | 5.91 | 3.14 |
| Peripheral blocks | 1.61 | 0.61 |
| HTML titles / 1,000 text units | 0.49 | 3.47 |
| HTML headings / 1,000 text units | 3.52 | 28.95 |
| HTML paragraphs / 1,000 text units | 8.85 | 25.25 |

Other results: posters/infographics 99 vs 66; **QR codes 94 vs 2**; autoplay elements 99 vs 39; Chinese palettes wider, more saturated and brighter.

**Caution:** the sample is institutional websites, not commercial apps. It shows differences in the sample, not universal user preferences.

### 2.3 Density ≠ bad UX (Nielsen Norman Group, 2016)
*Are Chinese Websites Too Complex?*
- Chinese users: prefer relatively high information density.
- Western users: prefer visual simplicity.
- Both struggle when complexity becomes excessive.
- **Familiarity with conventions** shapes perceived complexity.
- Do not reduce Chinese design to a "less refined" version of Western design.

## 3. Interface composition

### 3.1 Western model: hierarchy and selection
Header with navigation → hero/main content → hierarchical sections → clear primary CTAs → less prominent secondary content → informational footer. Limits the number of elements competing for attention. Goal: quickly spot the main function and complete the task.

### 3.2 Chinese model: density and simultaneous access
Header with multiple entry points; many content blocks; several categories visible; promotional/editorial banners; icons and shortcuts; QR codes; feeds and recommendations; dynamically updated content; integrated commercial elements. Goal: multiple access paths and discovery opportunities from the same screen.

### 3.3 Operational differences

| Feature | West | China |
|---|---|---|
| Header | Selective | More articulated |
| Homepage | Vertical hierarchy | Multiple simultaneous blocks and paths |
| White space | Structural element | Less dominant |
| Cards | Little information | Higher density |
| Banners | Selective | Numerous and dynamic |
| Icons | Main functions | Many shortcuts |
| QR code | Specific function | Also an entry point to services |
| Feed | Often a separate section | Can be central to the homepage |
| CTA | Few dominant actions | More actions available |
| Information | Progressive disclosure | More simultaneous information |

### 3.4 Semantic structure
Western samples show more headings and structured paragraphs. This does not mean Chinese sites are less accessible: do not conflate visual organization, HTML organization, semantic hierarchy, accessibility and ease of navigation. A dense UI can have good semantics: preserve this in both versions.

## 4. Search engines

- **Google**: SERP with organic results, ads, snippets, images, video, maps, shopping, info panels, AI Overviews → from a list of links to a composite answer.
- **Bing**: similar conventions, with Copilot integrated, visual search, Microsoft services.
- **Baidu**: web search + editorial content + personalized feed + video + maps + services + Mini Programs + AI answers. Company data: ~70% of mobile SERPs contained AI content in Q3 2025 (64% in July 2025); Baidu App had 708M MAU in September 2025. Search is an access interface to content and services.

### Web search vs in-platform search

| Need | West | China |
|---|---|---|
| Web search | Google, Bing | Baidu, Bing |
| Products | Google Shopping, Amazon | Taobao, JD.com, Pinduoduo |
| Reviews/experiences | Google, Reddit, specialist sites | Xiaohongshu, Douyin |
| Video | YouTube | Douyin, Bilibili, Kuaishou |
| Places/activities | Google Maps, Yelp | Amap, Baidu Maps, Dianping |
| Information/community | Reddit, forums, portals | Zhihu, WeChat, Xiaohongshu |
| Integrated services | Separate apps and sites | WeChat, Alipay, Baidu App |

Not a one-to-one substitution.

### Market share: caution
StatCounter measures visits to sites using its tracker, not total searches; search inside WeChat/Douyin/Xiaohongshu/Taobao does not appear as search-engine traffic. October 2026: Baidu first in the measured market, with strong desktop/mobile differences. Do not use as the sole basis for strategy. Entering China takes more than optimizing for Baidu: in-platform search and social discovery matter.

## 5. Digital ecosystems

- **West**: Google (Search, Maps, Gmail, Drive, YouTube, Shopping, Android), Meta (Facebook, Instagram, WhatsApp, Messenger), Amazon, Microsoft. Shared accounts/infrastructure, but distinct interfaces and apps.
- **China**: WeChat (messaging, payments, official accounts, Mini Programs, search), Alipay, Douyin, Xiaohongshu/RedNote, Taobao, Baidu App.

**Architectural difference:** it is not that the West lacks super-apps; diffusion and centrality differ. A Western user spreads activities across services (searches on Google, reads reviews on external sites, books via a dedicated service, pays with a wallet, contacts via WhatsApp); a Chinese user can do much of it inside one ecosystem or via Mini Programs.

### Mini Programs
Lightweight apps inside a host (WeChat, Alipay). Access via QR, in-app search, sharing, official account.
- Advantages: no install or new account; existing account and payments; re-access from several channels.
- Limits: dependence on host rules/APIs/approvals; possible duplication of logic; less control of the experience.

## 6. E-commerce and social commerce

| West | China | Function |
|---|---|---|
| Amazon | Taobao / Tmall | Marketplace |
| eBay | Pinduoduo | Marketplace / promotional-social buying |
| Instagram Shopping | Douyin | Social discovery and commerce |
| YouTube | Douyin / Bilibili | Video |
| Reddit | Xiaohongshu / Zhihu | Opinions and community |
| Google Shopping | JD.com / Taobao | Search and purchase |

Functional, not technological, equivalences.

- **West**: product search → results and filters → product page → reviews/comparison → cart and checkout.
- **China**: feed/search/creator → content/review/live → interaction and recommendation → product page → integrated purchase. Content can generate the need.

**Live commerce**: one screen with live video, creator/seller, chat, viewer count, promotions, products, cart, coupons, countdown, purchase. USDA 2024 estimates (from Chinese and industry data): market ~$807B, 833M users, 75.2% of internet users. A 2024 study of 7,701 Douyin users: positive associations between streamer social presence, other viewers' presence, experience and purchase intention. These are estimates, not independent measures of UX effectiveness.

**Implications:** an e-commerce for China is not "Amazon translated". Evaluate: content/feed as entry points, visual reviews, demo videos, creators/community, coupons, quick purchase, local payments, loyalty, integration with social ecosystems. Not everything is always needed: depends on sector, positioning, audience.

## 7. Registration, authentication, payments

| Function | West | China |
|---|---|---|
| Email | Very common | Present |
| Password | Very common | Present |
| Social login | Google, Apple, Meta | WeChat, local accounts |
| Phone number | Common | Very important |
| SMS OTP | Used | Very common |
| QR login | Less central | Important convention |
| Cross-service account | Major ecosystems | Central in super-apps |

**QR login**: desktop shows a QR → user scans with the already-authenticated mobile app → confirms → desktop session authorized.

**Payments** — US/EU: cards, Apple Pay, Google Pay, PayPal, local wallets, bank transfers. China: Alipay, WeChat Pay, QR, integrated wallets, in-app payments, local systems. To design: method availability, authorization, refunds, receipts, errors, account–wallet linking, support/disputes. A checkout offering only PayPal/international cards in Chinese is inadequate. 2025 industry figure: ~92.8% of Chinese internet users used online payments in 2024 (estimate).

## 8. Privacy, trust, regulation

- **US**: fragmented — sectoral federal rules, state laws (CCPA and later), FTC Act against deceptive practices.
- **EU**: GDPR, ePrivacy, Digital Services Act (recommender transparency, ban on dark patterns), Digital Markets Act (competition/interoperability), European Accessibility Act.
- **China**: PIPL — legal bases, voluntary/explicit/informed consent, specific purposes, minimization, data-subject rights, cross-border transfers, sensitive data; also applies to some processing outside China involving people in China. CAC rules on necessary personal information for apps: refusing unnecessary data must not block basic functions.

| Component | US | EU | China |
|---|---|---|---|
| Cookies/tracking | Variable | ePrivacy/GDPR | PIPL and applicable rules |
| Consent | Context-dependent | Highly structured | PIPL notices and consent |
| Profiling | Fragmented | Specific constraints | Specific constraints |
| Data transfer | Sectoral/state | GDPR | PIPL and cross-border rules |
| Algorithmic transparency | Variable | DSA and others | Chinese rules |
| Accessibility | ADA and others | EAA | Local standards |

**Design guidance:** privacy and security are common core; consent, notices, retention and transfers are configurable per regulation. Chinese UI density is not a justification for less transparency or less accessible controls.

## 9. Comparative summary

| Dimension | US/EU | China |
|---|---|---|
| Philosophy | Task-oriented | Ecosystem-oriented |
| Homepage | Selection and hierarchy | Multiple access and density |
| Density | Contained | Higher |
| White space | More important | Less dominant |
| Navigation | Menus and paths | Shortcuts, feed, categories |
| Search | Central general-purpose engine | Web + in-app search |
| Discovery | Search, social, ads | Search, feed, creators, community |
| Social commerce | Growing | Strongly integrated |
| E-commerce | Product and conversion | Product, content, conversion |
| Login | Email, password, social, passkey | Local accounts, phone, QR |
| Payments | Cards, wallets, banks | Alipay, WeChat Pay, QR |
| Services | Distributed | Super-apps |
| Personalization | Feeds and recommendations | Integrated in journeys |
| Privacy | US/EU differences | PIPL and local rules |

Prevailing tendencies, not a rigid classification of individual users.

## 10. Recommended architecture for a single product

```
FUNCTIONAL CORE (business logic · API · DB · security)
        │
UX ADAPTATION LAYER (layout · components · navigation · flows · density · personalization)
        │
 WESTERN UI (task-oriented)      CHINA UI (ecosystem-oriented)
```

- **Share**: features, DB/information models, APIs, authorization, security, logic, core design tokens, accessibility standards, validation.
- **Make configurable**: homepage (selective/multi-path), header, navigation (menu / shortcuts+feed), cards, feed (secondary/central), search (search-first / search+discovery), recommendations, registration, payments, social.
- **Localization ≠ technological integration**: Chinese characters, more icons, other colors, more content are *not enough*. Depending on the case: WeChat authentication, Mini Programs, Alipay/WeChat Pay, local platforms, hosting compliant with Chinese rules, local search engines and analytics — technological and commercial requirements, not UI.

## 11. UX validation protocol

- **Variants**: A Western UX · B Chinese UX · C hybrid (to learn whether two experiences are needed or an adaptive system suffices).
- **Tasks**: identify a function; find content; find a product; compare two options; register; complete a purchase; change settings; re-find previously viewed content.
- **Metrics**: task completion rate, time on task, error rate, navigation depth, click count, abandonment rate, SUS, satisfaction.
- Real users of both markets, in their language, on their usual devices.

## 12. Five conclusions

1. Screen composition differs (selective hierarchy and white space vs more elements, blocks, shortcuts).
2. Navigation follows different logics (toward a goal vs access to an ecosystem).
3. Search is not only web search (discovery inside Douyin, Xiaohongshu, Taobao, WeChat).
4. Commerce is more tightly integrated with content.
5. Localization involves product architecture (auth, payments, local services, search, distribution, regulation).

**Final recommendation:** two reference configurations (Western: clarity, hierarchy, task-oriented, progressive disclosure; Chinese: density, simultaneous access, integrated search, discovery, services/ecosystems), used as **baselines to validate**, not imposed.

## 13. Key bibliography

**Studies**
- Li, Karreman, de Jong (2022), *Cultural Differences in Web Design on Chinese and Western Websites* — https://ieeexplore.ieee.org/document/9881630
- Li, Karreman, de Jong (2026), *Cross-Cultural Design: Comparing the Visual Characteristics of Chinese and Western Municipal Websites* — https://journals.sagepub.com/doi/full/10.1177/00472816261460385
- NN/G (2016), *Are Chinese Websites Too Complex?* — https://www.nngroup.com/articles/china-website-complexity/
- *Digital Platforms' Growth Strategies and the Rise of Super Apps* (2024) — https://www.sciencedirect.com/science/article/pii/S2405844024018875
- *Understanding Customer Experience in Live Streaming Shopping* (2024) — https://www.nature.com/articles/s41599-024-02690-6
- *Customer Journeys in Livestream Commerce* (2025) — https://www.tandfonline.com/doi/full/10.1080/09593969.2025.2518211

**Search, engines, platforms**
- Baidu Q3 2025 Results — https://ir.baidu.com/news-releases/news-release-details/baidu-announces-third-quarter-2025-results
- Baidu Q2 2025 Results — https://ir.baidu.com/news-releases/news-release-details/baidu-announces-second-quarter-2025-results/
- Baidu Mobile Ecosystem — https://ir.baidu.com/baidu-general-business
- China Search Engine Market (Oct 2026) — https://indexinchina.com/search-engines/market-share/
- USDA, *Selling in China – The Rise of Livestreaming E-commerce* (2025)
- Tencent, Weixin Mini Programs — https://www.tencent.com/products/weixin-mini-programs/
- Alipay Mini Program UX — https://pds.alipay.com/docs/miniprogram/design/overview

**Regulation**
- PIPL — https://en.spp.gov.cn/2021-12/29/c_948419.htm
- Digital Services Act — https://www.consilium.europa.eu/en/policies/digital-services-act/
- Digital Markets Act — https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability_en
- EDPB, Guidelines 03/2022 on dark patterns — https://www.edpb.europa.eu/system/files/2022-03/edpb_03-2022_guidelines_on_dark_patterns_in_social_media_platform_interfaces_en.pdf
- CAC, rules on necessary personal information for apps — https://www.cac.gov.cn/2021-03/22/c_1617990997054277.htm

Company sources are not independent evidence.
