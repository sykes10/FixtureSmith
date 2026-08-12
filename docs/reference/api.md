# API reference

Application code normally imports from `@fixturesmith/zod`.

## `fixture()`

```ts
fixture(schema, options?)
```

Returns `z.output<typeof schema>` after generating and parsing one value.

## `fixture.many()`

```ts
fixture.many(schema, count, options?)
```

Returns `Array<z.output<typeof schema>>`. `count` must be a non-negative safe
integer. A zero count returns immediately without walking the schema.

## Options

- `seed?: number | string` controls deterministic replay.
- `now?: Date` supplies the shared session instant; the default is
  `2000-01-01T00:00:00.000Z`.
- `provider?: PrimitiveProvider` replaces the default Faker provider.
- `optionals?: "present" | "omit"` controls optional values.
- `nullables?: "value" | "null"` controls nullable values.
- `overrides?: FixtureOverrides<z.output<S>>` customizes generated values.

## Overrides

Pass overrides through the options object. Each output field accepts its inferred
static value, a callback returning that value, or a recursive partial object for
nested fields. Unknown properties and incorrect values fail TypeScript
compilation.

## `defineFixture()`

```ts
const user = defineFixture(UserSchema, {
  defaults: {
    role: "member",
  },
  variants: {
    admin: { role: "admin" },
  },
})

user.create({ variant: "admin", seed: 42 })
user.many(3, { variant: "admin", seed: 42 })
```

Definitions are immutable declarations. Defaults and the selected variant use
the same typed static values and deterministic callbacks as overrides. At most
one variant can be selected per creation.

The optional derivation callback receives a complete provisional value, the
collection index, and the shared session time. Its typed partial result is
applied atomically, while explicitly overridden target fields remain unchanged.
The final value is parsed by the source schema.

```ts
const booking = defineFixture(BookingSchema, {
  derive: ({ value }) => ({
    endsAt: addHours(value.startsAt, 2),
  }),
})
```

## Errors

The Zod facade exports `FixtureError` and every concrete error class. Consumers
should branch on the stable `code` property rather than matching complete error
messages.

See the detailed [public API contract](../public-api.md) and
[error reference](../errors.md).
