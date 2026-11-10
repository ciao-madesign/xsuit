# 13 — Guide for the measurements on your PC

Goal: collect the real-site data that unlocks A3 (replication) and A5 (tuning). About 2–3 hours for the minimum set. Nothing is sent anywhere; files stay on your PC.

## 0. One-time setup (15 min)

1. Install Node.js 20+ and Git.
2. Terminal:
   ```bash
   git clone https://github.com/ciao-madesign/xsuit.git
   cd xsuit
   git checkout claude/great-curie-8yfsjr
   npm install
   npm run build
   ```
3. Chrome: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, choose the `dist` folder. Pin the xsuit icon.

## 1. Measure a page (2 min each)

1. Open the page in a normal Chrome window, **logged out**, desktop size. Set the window to about 1280 px wide.
2. Wait until it has fully loaded. Do not scroll. Close cookie banners only if they cover the page; note it.
3. Click the xsuit icon → **Research tools** → **Measure this page** → **Download JSON**.
4. Move the file to `research/measurements/<site>/<page-type>__<date>.json`, using these folder names (the check script needs them):
   - Western: `google`, `amazon`, `bbc`, `guardian`, `youtube`, `reddit`, `instagram`
   - China: `baidu`, `taobao`, `alibaba`, `bilibili`, `caixin`, `weibo`, `rednote`, `wechat`
   - page types: `home`, `results` (search/list), `detail` (article/product/video)

## 2. Minimum set

At least **3 Western and 3 Chinese sites**, ideally these pairs (decision #2): Google–Baidu, Amazon–Taobao, BBC–Bilibili, Guardian–Caixin. For each site: home, one results/list page, one detail page. Use a comparable search term on both sites of a pair (a plain product or news topic). Caixin articles are paywalled: use home and index pages. If a Chinese site redirects or blocks you, note it and skip it; do not use a VPN trick that changes the page you see without writing it down.

Write anything unusual (login wall, consent banner, regional redirect, A/B variation) in `research/measurements/<site>/notes.md`.

## 3. Check the result (1 min)

```bash
npm run replication
```

It prints, for 3 metrics, the West and China medians and one verdict: `replicated`, `not-replicated` or `insufficient` (fewer than 3 files per side). Do not edit the verdict by hand.

## 4. Send the data back

```bash
git add research/measurements
git commit -m "Add measurements"
git push origin claude/great-curie-8yfsjr
```

Then tell me in a new session: "measurements added". I will downgrade or keep rules according to the verdicts, regenerate `docs/07-evidence-audit.md` and do the A5 tuning.

## 5. Optional, in the same session (30 min)

- **Adapters** (`adapters/VERIFY.md`): on the sites above, check each selector in DevTools. Note which ones fail; do not guess fixes.
- **Study figures**: open Li 2022 and Li 2026 (the links are in `rules/sources.json`) and check the numbers quoted in `docs/01-research-western-vs-chinese-ux.md` (density 38.21 vs 12.87, main blocks 5.91 vs 3.14, peripheral blocks 1.61 vs 0.61, image diversity 4.34 vs 6.32). Write down any difference.
- **Observation sheets** for Weibo, RED, WeChat: `docs/11-observation-sheets.md`.

## If something goes wrong

- "Could not reach the page": reload the page and try again.
- Metrics show `n/a`: the page had no layout yet; wait for full load and measure again.
- Never share files that contain personal data; measurement files hold numbers only.
