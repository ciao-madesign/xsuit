# rules/

Declarative JSON rule sets. Data only, never executable code.

- `western.json`, `china.json`: one rule set per profile (9 rules each, visual first).
- `profiles.json`: Market Profile definitions, including the explicit Hybrid composition.
- Every rule carries evidence level, limits and test results (`testResults` starts empty).
- Validate with `npm test`. The validator rejects protected elements, irreversible rules, bad dependencies and structural actions in visual mode.
