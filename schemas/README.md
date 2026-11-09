# schemas/

JSON Schema files describing the shape of rules, rule sets, profiles and adapters. They help editors and humans. The authoritative check at runtime is the TypeScript validator in `src/rules/validate.ts` (it also enforces safety rules the schema cannot express: protected elements, dependencies, mode limits).
