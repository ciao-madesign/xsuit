# rules/

Declarative JSON rule sets. Data only, never executable code.

- `western.json`, `china.json`: one rule set per profile (9 rules each, visual first).
- `dimensions.json`: the dimensions of a market configuration and their poles (density, palette, hierarchy...).
- `profiles.json`: Market Profiles as configurations (one pole per dimension). Western and China are reference configurations; Hybrid is the person's own choice.
- Each rule names its `dimension` and `pole` and carries `version`, `introduced`, `lastReviewed` and `history`. See `docs/20-market-profile-model.md`.
- Every rule carries evidence level, limits and test results (`testResults` starts empty).
- Validate with `npm test`. The validator rejects protected elements, irreversible rules, bad dependencies and structural actions in visual mode.
