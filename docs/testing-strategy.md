# Testing strategy

## Quality bar

A release is credible only when every documented supported schema produces
values accepted by that same schema and every seeded path is reproducible.

Tests should prove behavior at the lowest useful layer and then confirm the
packages work together as a real consumer would use them.

## Test layers

### Core unit tests

Cover dependency-free behavior:

- seed validation and normalization
- path encoding and child random derivation
- PRNG boundary helpers
- every IR node generator
- numeric and length constraint resolution
- override resolution
- path propagation
- structured error construction

Use small direct IR plans here; do not import Zod.

### Zod adapter compatibility tests

For every supported construct:

1. build a real Zod schema,
2. generate fixtures over a representative seed set,
3. assert `schema.safeParse(value).success`,
4. assert repeated generation with the same seed is deeply equal,
5. assert expected structured errors for unsupported or impossible schemas.

Use focused schemas plus representative deeply nested schemas.

### Provider contract tests

Run the same provider contract suite against the Faker provider and test
providers:

- same scoped source produces the same value,
- outputs satisfy the operation's basic format,
- no operation mutates unrelated random streams,
- provider failures retain operation and path context.

### Public API acceptance tests

Exercise only package exports:

```ts
fixture(schema)
fixture(schema, { overrides })
fixture(schema, { overrides, seed })
fixture.many(schema, count, { overrides, seed })

definition.create({ seed, variant })
definition.many(count, { seed, variant })

set.createScenario(name, { seed, overrides })
```

These tests cover the PRD acceptance criteria and should read like documentation.

Reusable definitions additionally prove default, variant, and derivation
precedence. Fixture sets prove that one scenario is one generation session, that
a whole state replays from its seed, and that scenario overrides reach every
fixture of that name.

### Type tests

Compile examples that verify:

- result types equal `z.output<typeof Schema>`,
- nested override keys and values are inferred,
- callback results match the field output type,
- `many()` returns the correct array type,
- unknown fields and invalid values produce expected compile errors,
- optional and nullable fields accept their inferred values.

Use the repository's selected type-test tool or dedicated `tsc --noEmit`
fixtures. Runtime assertions such as `expectTypeOf` can supplement but should not
replace negative compile tests.

### Package consumer tests

Pack built packages into tarballs and install them in minimal fixture projects.
Verify:

- ESM import resolution,
- declared exports,
- Zod peer dependency behavior,
- generated declaration files,
- no accidental source-only imports,
- no undeclared runtime dependencies.

Run a package-quality checker before publishing.

## Determinism suites

### Invariant tests

- Same seed and inputs produce equal output.
- Numeric and string forms of a seed follow documented normalization.
- Different field paths have independent streams.
- Adding a static override does not change unrelated fields.
- Single generation equals `many(..., 1)[0]`.
- Existing array element values remain stable when compatible array length changes.

### Golden tests

Keep a small human-reviewable set of exact outputs spanning all node kinds. Golden
changes require deliberate review because they may indicate a version-visible
determinism change.

Do not snapshot hundreds of random examples; invariants provide better evidence.

## Representative acceptance schema

Maintain at least one schema containing:

- constrained UUID, email, URL, and ordinary strings,
- bounded integer and number,
- boolean, date, literal, and enum,
- nested object,
- constrained array of nested objects,
- optional and nullable fields.

Generate it across multiple seeds, parse every output, override one deeply nested
field, and run `many(100)`.

## Negative matrix

Include explicit cases for:

- unsupported schema node at the root,
- unsupported schema node several levels deep,
- incompatible min/max constraints,
- invalid collection counts,
- invalid seed values,
- invalid static override,
- invalid callback output,
- throwing custom provider,
- schema parse failure retaining Zod issues.

Each asserts error class, code, typed path, and seed rather than entire message.

## Coverage expectations

Line coverage is a guardrail, not the release criterion. Release readiness comes
from complete compatibility-table coverage, determinism invariants, public type
tests, and consumer-package tests.

No supported row may lack a validation test. No public API overload may lack a
type test.

## Continuous integration

CI should run:

1. formatting and lint checks,
2. TypeScript build and type tests,
3. unit and compatibility tests,
4. package consumer tests,
5. changeset or release metadata checks when publishing begins.

Test the oldest and newest Node versions declared in package metadata. Pin the
package manager and use a frozen lockfile.
