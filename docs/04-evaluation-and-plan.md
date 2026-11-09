# 04 — Spec evaluation, proposed adjustments and work plan

> Working draft. Decisions are recorded in `05-decisions.md`; the build breakdown is in `06-builds.md`.

## Overall assessment
Solid idea; framing around "target market" (not nationality) is right. The main risk is ambition: **transforming the structure of arbitrary websites is very hard**. The V1 goal is to prove it works, not to cover the web.

## Strengths
- Clear principles: reversibility, local privacy, no interference with login and payments.
- Engine separated from profiles → new markets without rewriting the extension.
- Three modes (Visual / Structural / Deep) and confidence thresholds.
- Transformation Rule System as the first step.

## Proposed adjustments
1. **Narrow the MVP**: 4 known sites (one per category) with dedicated adapters; only Visual + some Structural. The generic Semantic Mapper comes later, from patterns emerging from adapters (the spec's order is inverted relative to feasibility).
2. **Defer Deep mode**: in the MVP only shortcuts, reordering and *one* alternative path.
3. **Limit of the Chinese profile on Western sites**: a site lacks Taobao's content, feeds and creators. Density and shortcuts can be adapted, not the ecosystem. State this to the user: these are "layout conventions", not full localization.
4. **Clarify the target user**: designer/researcher, end user browsing foreign sites, or researcher comparing versions — priorities and interface differ. Decided: UX designer/researcher.
5. **Evidence as hypothesis**: cited studies cover institutional sites and a 2016 NN/G study. Every rule carries a mandatory evidence level.
6. **Hybrid** deferred: nearly free if rules are well separated.
7. **Remote rule updates**: in tension with "no remote code" and store policies. Rules must be **declarative data**, never executable code.
8. **AI in recognition**: not in the MVP; later only local and only as suggestion.
9. **Measure effectiveness**: built-in original/adapted comparison (internal A/B), otherwise nothing is demonstrated.

## Work plan (indicative)

**Phase 0 — Definitions (1–2 wks)** target user and 4 test sites; collect real screenshots/patterns of both conventions; 15–20 hand-written rules with evidence and limits.

**Phase 1 — Rules and format (1–2 wks)** schemas for Transformation Rule, Market Profile, adapter; per-rule acceptance criteria (before/after example, test).

**Phase 2 — Chrome prototype (3–4 wks)** base extension (ON/OFF, profile, restore); Visual engine with rollback; 1 full adapter, then the other 3.

**Phase 3 — Structural (3–4 wks)** section reordering, shortcuts, dynamic sites, compatibility indicator.

**Phase 4 — Validation (2 wks)** user tests per market, spec metrics; decision on Deep mode and generic recognition.

## Open decisions
See `05-decisions.md` ("Still open"). They are asked one at a time.
