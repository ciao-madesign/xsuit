# 20 — Market profile model: dimensions and poles (B18)

Decision #53, validated by the user on 2026-11-10.

## The idea

Before B18 a profile was a fixed bag of rules ("Western", "China"). Now a **market profile is a configuration**: for each **dimension** of a user experience it picks one **pole**, or nothing (the page stays as it is). Rules belong to one pole of one dimension. The engine only ever receives the resulting list of rules, so:

- adding a market means adding a **configuration** (data), not engine code;
- Hybrid is simply "choose a pole for each dimension yourself"; two poles of the same dimension can never be used together, so conflicts cannot occur;
- "Western" and "China" are **reference configurations** built from observed tendencies in the cited studies. They are not claims about nationalities or what people prefer (see the limits in `07-evidence-audit.md`).

## Dimensions (rules/dimensions.json)

| Family                   | Dimension           | Poles              |
| ------------------------ | ------------------- | ------------------ |
| visual                   | Information density | spacious · compact |
| visual                   | Spacing scale       | airy · tight       |
| visual                   | Colour palette      | muted · vivid      |
| visual                   | Visual hierarchy    | strong · flat      |
| visual                   | Promotions          | quiet · prominent  |
| visual                   | Carousels           | quiet · prominent  |
| visual                   | Search entry        | prominent          |
| visual                   | Link affordance     | underlined         |
| visual                   | Imagery             | image-led          |
| information-architecture | Sidebar             | collapsed          |
| information-architecture | Discovery feed      | central            |
| information-architecture | Entry points        | surfaced           |

A dimension with one pole means "apply this, or leave the page alone". The full table with each rule, its version, evidence and the profiles that use it is generated in `07-evidence-audit.md` (`npm run evidence`).

## Reference configurations (rules/profiles.json)

- **Western:** density spacious, spacing airy, palette muted, hierarchy strong, promotions quiet, carousels quiet, search entry prominent, link affordance underlined, sidebar collapsed.
- **China:** density compact, spacing tight, palette vivid, hierarchy flat, promotions prominent, carousels prominent, imagery image-led, discovery central, entry points surfaced.
- **Hybrid (default):** search entry prominent, imagery image-led (what it always was). The person's own choices are stored as `hybridChoices` (one pole per dimension); an older rule-by-rule choice (`hybridRules`) still works until the person edits Hybrid.

## Rule versions

Every rule has `version` (semantic), `introduced`, `lastReviewed` (`null` = no person has reviewed it against its sources yet) and a `history` whose last entry is the current version. All 19 rules start at 1.0.0 with `lastReviewed: null`; nothing here claims a review that did not happen. Changing a rule's behaviour means a new version and a history entry.

## What was proven not to change

`tests/b18-golden.test.ts` compares the new code with a recording made **before** the change (`tests/golden/b18-before.json`): 636 cases, covering Western, China and two Hybrid settings, in visual and structural depth, on all 34 corpus pages (plan, skip reasons, rules applied, accessibility undo, hash of the adapted page) and on 432 planner situations (every page type × confidence × metric situation). All identical. The recording must not be regenerated to make a failing test pass.

## How to add a market

1. Add the id to `PROFILE_IDS` (`src/rules/vocab.ts`) and a short entry to `rules/profiles.json` with its `configuration` and evidence references. (The settings and popup vocabulary follows the vocabulary file; nothing in the engine changes.)
2. If the market needs a convention no pole covers, add a pole (and rules for it, with evidence and limits) to the dimension in `rules/dimensions.json`; or a new dimension.
3. Run `npm run check`, then `npm run lock` after the diff was reviewed.
   `tests/b18-dimensions.test.ts` shows this with a synthetic market planned, applied and restored by the unchanged engine.

## Not done here

- No new rules, no new evidence: B18 changes how rules are organised, not what they do.
- The Hybrid editor lists dimensions with plain descriptions; the evidence label per rule is shown next to the selected pole. A richer comparison view is B19.
- The popup still offers Original / Western / China / Hybrid; naming for other markets is a B20/B22 matter.
