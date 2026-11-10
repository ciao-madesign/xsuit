# schemas/

JSON Schema files describing the shape of rules, rule sets, profiles and adapters. They help editors and humans. The authoritative check at runtime is the TypeScript validator in `src/rules/validate.ts` (it also enforces safety rules the schema cannot express: protected elements, dependencies, mode limits).

## Research file schemas (closed)

`measurement.schema.json` (xsuit.metrics/2) and `report.schema.json` (xsuit.report/3) describe the only fields a research file may contain. They are **closed** (`additionalProperties: false`): any extra field, such as a URL path or page text, is invalid. The runtime gate is `src/research/privacy.ts` (it also scans text for personal data); tests check that the schemas and the gate agree. See `docs/19-privacy-and-data-governance.md`.
