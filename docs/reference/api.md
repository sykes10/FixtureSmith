# API reference

Application code normally imports from `@fixturesmith/zod`.

## `fixture()`

```ts
fixture(schema, overrides?, options?)
```

Returns `z.output<typeof schema>` after generating and parsing one value.

## `fixture.many()`

```ts
fixture.many(schema, count, overrides?, options?)
```

Returns `Array<z.output<typeof schema>>`. `count` must be a non-negative safe
integer. A zero count returns immediately without walking the schema.

## Options

- `seed?: number | string` controls deterministic replay.
- `provider?: PrimitiveProvider` replaces the default Faker provider.

## Overrides

Each output field accepts its inferred static value, a callback returning that
value, or a recursive partial object for nested fields. Unknown properties and
incorrect values fail TypeScript compilation.

## Errors

The Zod facade exports `FixtureError` and every concrete error class. Consumers
should branch on the stable `code` property rather than matching complete error
messages.

See the detailed [public API contract](../public-api.md) and
[error reference](../errors.md).
