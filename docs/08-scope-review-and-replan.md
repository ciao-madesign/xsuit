# 08 — Scope review, feature deepening and re-plan (2026-11-09)

Written after B0–B4, before continuing. Status: **approved by the user on 2026-11-09** (decision #15); B5, B6, B7, B8 done. Every point states its reason.

## 1. Where we stand, honestly

- Built: rule system, extension shell, reversible engine, justified effect catalog, two draft adapters. 73 tests pass.
- Evidence base is thin: 3 external sources, only 1 verified (NN/G, n=12). 18 rules: 0 strong, 6 moderate, 7 emerging, 5 hypothesis. Almost all measured evidence comes from one study of **municipal homepages**, which is not what our test sites are.
- Adapters are unverified drafts: this session cannot open the real sites.
- Nothing has been judged by a human eye on a real page yet.

## 2. Gaps found in the scope

| #   | Gap                                                                                                | Why it matters                                                                                                                                                                                                                              | Proposed answer                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Rules apply blindly. "Compact density" is applied even to a page that is already dense.            | The research describes _differences between_ conventions. A transformation should close the distance between a page and the target profile, not push every page the same way. Applying the China profile to Baidu should do almost nothing. | **Measure first, then apply only the delta.** New rule conditions based on measured page metrics (`metric-above`, `metric-below`).                                                                                                         |
| G2  | We have no data of our own.                                                                        | Decision #9 requires real studies or real observations. Our own measurements of the paired test sites are real, traceable observations and directly relevant (commercial sites, not municipal ones).                                        | **Page metrics module** that replicates the indicators of Li 2026 (visual density, block counts, image count, headings, autoplay, QR codes, saturation, white-space ratio, underlined links). Runs locally in the extension; exports JSON. |
| G3  | The primary user (UX designer/researcher, decision #1) gets little value today.                    | A researcher wants to _see and compare_, not only to restyle.                                                                                                                                                                               | **Audit mode**: "Measure this page", comparison with profile baselines, export. The measurement tool is a feature, not only an internal aid.                                                                                               |
| G4  | Transparency is missing.                                                                           | Spec principle 4: the user must know what is modified and why. Decision #9 is useless if evidence is invisible in the product.                                                                                                              | **Explain panel**: applied rules, skipped rules with reasons, evidence level and sources per rule, per-rule on/off.                                                                                                                        |
| G5  | Accessibility is protected only by static rules on CSS properties.                                 | Spec principle 9. A filter can still interact badly with a specific page.                                                                                                                                                                   | **Runtime accessibility guard**: check contrast and target size on changed elements before/after; auto-revert a rule that makes them worse.                                                                                                |
| G6  | Permissions are wider than needed (content script on all sites).                                   | Spec principle 5 and "minimal permissions"; also store review risk.                                                                                                                                                                         | Run automatically only where the user enabled it (per-site opt-in); elsewhere on click only.                                                                                                                                               |
| G7  | `alibaba.com` is the international B2B site designed for foreign buyers.                           | It is not representative of China-oriented UX; using it as "the Chinese side" would bias observations.                                                                                                                                      | Use Taobao or JD.com as the China-oriented e-commerce reference; keep Alibaba.com as a secondary, clearly labelled case. **Needs user decision.**                                                                                          |
| G8  | Chinese UX is largely mobile/app-first; we work on desktop web.                                    | Desktop versions of Chinese services can differ from what users actually use. Findings must not be over-generalised.                                                                                                                        | State the limit in every report; record viewport in measurements; no claim about apps.                                                                                                                                                     |
| G9  | Login-gated platforms (WeChat, RED, Weibo, Instagram) cannot be adapted or measured automatically. | No public DOM to work on.                                                                                                                                                                                                                   | Study-only: manual observation sheets with a fixed template; no adapters in V1.                                                                                                                                                            |
| G10 | Two test sites still TBD.                                                                          | Blocks the paired study.                                                                                                                                                                                                                    | Proposal: Bilibili (entertainment), Caixin (non-state-run news). **Needs user decision.**                                                                                                                                                  |
| G11 | Technical risks not yet tested: page CSP vs injected styles, shadow DOM, iframes, SPA navigation.  | Could make the engine silently fail on real sites.                                                                                                                                                                                          | Explicit test items in the analyzer build and in validation.                                                                                                                                                                               |
| G12 | Two of three sources unverified.                                                                   | Decision #9.                                                                                                                                                                                                                                | User checks Li 2022/2026 figures or supplies PDFs; until then rules stay flagged. Add verified literature (section 4).                                                                                                                     |

## 3. Feature deepening (what the product could do, by value for the primary user)

**Core, proposed for V1**

1. _Measure & audit_ (G2, G3): page metrics, profile distance, export.
2. _Delta-based transformation_ (G1): rules fire only when the page differs from the target.
3. _Explain panel_ (G4): what changed, why, on what evidence; per-rule toggles.
4. _Accessibility guard_ (G5).
5. _Before/after comparison_: side-by-side view plus before/after metrics, exportable as a small report.
6. _Hybrid editor_: pick rules from both profiles (the Hybrid profile becomes user-defined instead of hard-coded).

**Useful, low risk, proposed as optional in V1** 7. _Ecosystem equivalents panel_: in the popup only (never injected in the page), shows the counterpart service category from the table in doc 01 §4 (e.g. maps → Amap/Baidu Maps). Informational; no integration is claimed (spec §ecosystem rules). 8. _Observation sheets_ for login-gated platforms (G9): structured template stored in the repo.

**Deferred (after V1), with reason**

- Pausing autoplay / changing carousels behaviour: touches interaction, higher risk.
- Adding components (QR handoff, shortcut bars): "Deep" mode, deferred by decision.
- Translation or script change: out of scope (profiles are separate from language).
- Mobile emulation, Firefox, community adapters, visual rule editor.

## 4. Further analyses proposed

| Analysis                       | Purpose                                                                                                                    | Who / how                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A1. Verify Li 2022 and Li 2026 | Confirm the figures all moderate rules depend on                                                                           | User (PC) or PDFs supplied to the session                                                                 |
| A2. Paired-site measurement    | Own dataset: the same indicators on each Western/Chinese pair, 3 page types per site                                       | User runs "Measure this page" on real sites; data committed under `research/measurements/`                |
| A3. Replication check          | Do commercial sites show the same direction as municipal homepages? Rules whose direction is not replicated get downgraded | Computed from A2                                                                                          |
| A4. Literature expansion       | Raise or lower evidence levels with independent work                                                                       | Candidates below; none may be cited by a rule until read and verified                                     |
| A5. Effect magnitude tuning    | Effect sizes are design choices today                                                                                      | Use A2 medians as targets (e.g. spacing so that density moves toward the target profile's measured range) |
| A6. Accessibility baseline     | Contrast and target sizes before/after on every test page                                                                  | Automated in the guard, summarised in validation                                                          |

**A4 candidate literature (from general knowledge, UNVERIFIED — to be read before any use):** Reinecke & Gajos 2014 (visual preferences across countries, large online sample); Reinecke & Bernstein 2011/2013 (culturally adaptive interfaces); Cyr 2008 (website design, trust and satisfaction across cultures); Marcus & Gould 2000 (cultural dimensions and web UI); Dong & Lee 2008 (eye-tracking of web page viewing across cultures); Nisbett & Masuda 2003 (holistic vs analytic perception). They are listed so they can be checked, not as evidence.

## 5. Candidate rules (not added yet)

Each enters `rules/` only with the evidence standard of decision #9. "Needs" says what is missing.

| Candidate                                                                                             | Profile | Basis today                                | Needs                                            |
| ----------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------ | ------------------------------------------------ |
| Density / spacing rules become delta-based (fire only if the measured density is far from the target) | both    | li2026 + G1 reasoning                      | Metrics module, A2 baselines                     |
| Keep the footer articulated and visible                                                               | Western | li2022: articulated footers                | A1 verification                                  |
| Progressive disclosure: collapse peripheral blocks                                                    | Western | li2026: peripheral blocks 0.61 vs 1.61     | Structural engine, A3                            |
| Keep peripheral blocks expanded and visible                                                           | China   | same figure, opposite direction            | Structural engine, A3                            |
| More parallel entry points near the top (shortcuts to existing sections)                              | China   | li2026 main blocks 5.91 vs 3.14; synthesis | Structural engine; hypothesis until A3           |
| Fewer competing primary actions above the fold                                                        | Western | synthesis only                             | Evidence from A2/A4; hypothesis                  |
| Images: calmer, fewer distinct image styles above the fold                                            | Western | li2026 image diversity 4.34 vs 6.32        | A3; unclear if achievable without hiding content |
| Reduce motion from autoplay (visual de-emphasis only)                                                 | Western | li2026 autoplay 39 vs 99                   | A1; behaviour change deferred                    |
| Text block rhythm for CJK pages (only when page language is Chinese)                                  | China   | doc 02 typography notes (synthesis)        | A4 evidence; hypothesis                          |
| The two "visual hierarchy" rules get effects                                                          | both    | none direct                                | A2 metric for hierarchy, or stay inactive        |

## 6. Re-planned builds

Done: B0–B4. The old B5–B8 are reorganised into B5–B11 below. Reason for the new order: measurement comes first because it feeds evidence (G2), correct rule behaviour (G1) and the primary user's value (G3); transparency and safety come before more transformations so that every later rule is visible and guarded.

| Build | Name                                  | Goal                                                                                                                                                      | Done when                                                                                                   |
| ----- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| B5    | Page metrics & audit                  | Metrics module replicating study indicators; "Measure this page" in popup; JSON export; `research/measurements/` layout; per-site opt-in permissions (G6) | Metrics are deterministic on fixtures; export works in real Chromium                                        |
| B6    | Delta-based rules                     | Metric conditions in the rule vocabulary; profile baselines (provisional from li2026, replaceable by A2 data); density/spacing rules made delta-based     | China profile on an already dense fixture changes almost nothing; on a sparse one it applies                |
| B7    | Analyzer, semantic mapper, classifier | Generic recognition from HTML semantics and ARIA first; page-type classifier; confidence; tests for CSP, shadow DOM, iframes, SPA navigation (G11)        | Main components found on fixtures without adapters; low confidence falls back                               |
| B8    | Transparency & safety                 | Explain panel, per-rule toggles, compatibility indicator, runtime accessibility guard (G5)                                                                | Every applied/skipped rule is listed with evidence; a rule that worsens contrast is auto-reverted in a test |
| B9    | Structural transformations            | Reorder, group, collapse, shortcuts, all reversible; structural candidate rules that passed the evidence standard                                         | Structural changes restore exactly; original functions intact                                               |
| B10   | Comparison, Hybrid editor, adapters   | Side-by-side and before/after metrics report; user-defined Hybrid; remaining adapters (e-commerce, news, content); equivalents panel; observation sheets  | Report exportable; adapters validated or clearly marked draft                                               |
| B11   | Internal validation & report          | Replication check (A3), tuning (A5), accessibility baseline (A6), performance, zero external requests; go/no-go for Deep mode                             | Acceptance criteria of spec §15 checked and reported                                                        |

**Evidence track (parallel, mostly needs the user's PC):** A1 verification, A2 measurements on real sites, A4 reading. Rules are upgraded or downgraded as data arrives; `docs/07-evidence-audit.md` is regenerated each time.

## 6b. Product layering (decision #21)

The V1 audience (IX researchers) is only one part of the final product. The public tool is a toggle that personalizes the experience, with advanced settings. So:

- Layer 1 (everyone): "Personalize this site" toggle + style choice. Must work without reading anything.
- Layer 2 (advanced, collapsed): master switch, depth, apply now, restore, per-rule toggles, all options.
- Layer 3 (research tools, collapsed): measure/export, explain details with evidence, comparison report, observation sheets, equivalents panel.
- B8 (transparency) must design what the simple toggle does for a non-expert (sensible default style, plain-language "what changed"), and keep evidence detail in layer 3. Popup already restructured in this order.

## 7. Decisions needed from the user (one at a time)

1. Approve this re-plan (B5–B11) and the delta-based approach.
2. China-oriented e-commerce reference: Taobao or JD.com instead of Alibaba.com (G7).
3. The two TBD sites: Bilibili and Caixin (G10).
4. Optional features 7–8 in or out of V1. **Answered: both in (B10).** Items 1–3 answered (decisions #15, #18, #19).
