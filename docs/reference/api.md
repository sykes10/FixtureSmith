# API cheat sheet

Signatures only. The [public API contract](../public-api.md) is the canonical
description of behavior, precedence, and guarantees.

Application code imports from `@fixturesmith/zod`.

## Generation

```ts
fixture(schema, options?): z.output<S>
fixture.many(schema, count, options?): Array<z.output<S>>
```

`count` must be a non-negative safe integer.

## Reusable definitions

```ts
defineFixture(schema, config?): FixtureDefinition
// config: { defaults?, variants?, derive? }

definition.create(options?): z.output<S>
definition.many(count, options?): Array<z.output<S>>
// options add: { variant? }
```

## Fixture sets

```ts
defineFixtureSet({ fixtures, scenarios }): FixtureSet

set.fixtures                              // the definitions, still usable alone
set.createScenario(name, options?)        // returns what the recipe returned
// options add: { overrides: { [fixtureName]: … } }
```

Inside a recipe:

```ts
create(name, options?)                    // options: { overrides?, variant? }
create.many(name, count, options?)
```

## Session options

Accepted by `fixture`, `fixture.many`, `create`, `many`, and `createScenario`:

| Option | Type | Default |
| --- | --- | --- |
| `seed` | `number \| string` | platform entropy |
| `now` | `Date` | `2000-01-01T00:00:00.000Z` |
| `provider` | `PrimitiveProvider` | Faker provider |
| `optionals` | `"present" \| "omit"` | `"present"` |
| `nullables` | `"value" \| "null"` | `"value"` |
| `overrides` | `FixtureOverrides<z.output<S>>` | none |

Inside a scenario these belong to `createScenario`, not to individual `create()`
calls.

## Errors

Every concrete error class is exported alongside `FixtureError`. Branch on the
stable `code` property rather than matching messages.

| Code | Class |
| --- | --- |
| `UNSUPPORTED_SCHEMA` | `UnsupportedSchemaError` |
| `INVALID_SCHEMA_CONSTRAINT` | `InvalidSchemaConstraintError` |
| `INVALID_FIXTURE_OPTIONS` | `InvalidFixtureOptionsError` |
| `FIXTURE_VALIDATION` | `FixtureValidationError` |
| `PROVIDER_ERROR` | `ProviderError` |

## Where behavior is defined

- [Public API contract](../public-api.md) — semantics, precedence, guarantees
- [Overrides](../guides/overrides.md) and [Scenarios](../guides/scenarios.md)
- [Schema support](../schema-support.md) — the supported Zod subset
- [Determinism](../determinism.md) — the seed contract
- [Errors](../errors.md) — diagnostics detail
