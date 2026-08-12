# Public API contract

This document defines the implemented TypeScript API.

## Imports

Application code uses the Zod facade:

```ts
import { defineFixture, fixture, FixtureError } from "@fixturesmith/zod"
```

Advanced consumers can import provider and engine contracts from their owning
packages. Internal IR types should remain public only when needed to build an
adapter; avoid exposing implementation details prematurely.

## Generate one value

```ts
function fixture<S extends z.ZodType>(
  schema: S,
  options?: FixtureOptions<S>,
): z.output<S>
```

Examples:

```ts
const user = fixture(UserSchema)

const admin = fixture(UserSchema, {
  overrides: {
    role: "admin",
  },
})

const replayed = fixture(UserSchema, {
  seed: 1_234,
})
```

The schema is parsed before the value is returned. The public result type is
Zod's output type, not its input type.

TypeScript cannot express the full runtime compatibility matrix in the generic
constraint—for example, supported and unsupported refinements can share a public
schema type. The facade accepts a Zod schema and reports unsupported constructs
with a typed runtime error.

## Generate many values

```ts
fixture.many<S extends z.ZodType>(
  schema: S,
  count: number,
  options?: FixtureOptions<S>,
): Array<z.output<S>>
```

```ts
const users = fixture.many(UserSchema, 20, {
  overrides: {
    role: "member",
  },
  seed: 42,
})
```

Rules:

- `count` must be a non-negative safe integer.
- `count === 0` returns an empty array without walking the schema.
- Each item receives its zero-based index in callback context.
- Static overrides apply to every item.
- Callback overrides run once per item and field.
- Item generation is deterministic and isolated by item index.

## Options

```ts
interface FixtureOptions<S extends z.ZodType> {
  now?: Date
  nullables?: "value" | "null"
  optionals?: "present" | "omit"
  overrides?: FixtureOverrides<z.output<S>>
  seed?: SeedInput
  provider?: PrimitiveProvider
}

type SeedInput = number | string
```

Seed normalization is defined in [Determinism](determinism.md). Every generation
session uses one `now` instant; when omitted it defaults to the exported stable
instant `2000-01-01T00:00:00.000Z`.

Optional properties are present and nullable values are non-null by default.
`optionals: "omit"` omits optional object properties, while
`nullables: "null"` generates `null`. Explicit overrides take precedence over
both policies.

When `seed` is omitted, the facade generates a root seed using platform entropy.
The result remains valid but is not expected to replay unless that chosen seed is
captured. A later test helper can surface implicit seeds automatically.

## Overrides

Overrides are recursive partial object descriptions. Each property accepts a
static output value or callback. Nested object literals merge recursively;
arrays, dates, maps, sets, and other atomic values replace the generated value.

Conceptually:

```ts
type FixtureOverrides<T> = T extends AtomicFixtureValue
  ? FixtureValueOverride<T>
  : T extends readonly unknown[]
    ? FixtureValueOverride<T>
    : T extends object
      ? { [K in keyof T]?: FixtureOverrides<T[K]> | FixtureCallback<T[K]> }
      : FixtureValueOverride<T>

type FixtureValueOverride<T> = T | FixtureCallback<T>
```

The actual implementation may use helper types to avoid excessive TypeScript
instantiation depth.

### Static override

```ts
const user = fixture(UserSchema, {
  overrides: {
    role: "admin",
    profile: {
      displayName: "Ada",
    },
  },
})
```

Only `profile.displayName` is supplied. Other `profile` fields are generated.

### Callback override

```ts
const users = fixture.many(UserSchema, 3, {
  overrides: {
    email: ({ index, provider }) =>
      `user-${index}-${provider.uuid()}@example.test`,
  },
  seed: 42,
})
```

The callback API exposes a narrow deterministic context:

```ts
interface FixtureCallbackContext {
  readonly index: number
  readonly now: Date
  readonly path: readonly (string | number)[]
  readonly seed: NormalizedSeed
  readonly random: RandomSource
  readonly provider: BoundPrimitiveProvider
}
```

`provider` is bound to the current scoped random source, so callbacks do not pass
context manually. Sibling values are deliberately absent because they would
create field-order and partial-object semantics. Future cross-field dependencies
will use a separate explicit derivation mechanism.

### Override precedence

Immediate generation has two applicable layers:

1. Per-call override
2. Schema-derived or provider-generated value

## Reusable fixture definitions

`defineFixture()` creates an immutable definition bound to one schema:

```ts
const user = defineFixture(UserSchema, {
  defaults: {
    role: "member",
  },
  variants: {
    admin: { role: "admin" },
  },
})

const member = user.create({ seed: 42 })
const admin = user.create({ seed: 42, variant: "admin" })
const admins = user.many(3, { seed: 42, variant: "admin" })
```

Defaults and variants accept the same recursive static values and callbacks as
per-call overrides. Creation selects zero or one statically known variant.
Per-call overrides have higher precedence than the selected variant, which has
higher precedence than defaults.

An optional derivation calculates cross-field values from a complete provisional
fixture:

```ts
const booking = defineFixture(BookingSchema, {
  derive: ({ value, now, index }) => ({
    endsAt: addHours(value.startsAt, 2),
    label: `${index}-${now.toISOString()}`,
  }),
})
```

Each definition has at most one atomic derivation. It receives a readonly value,
the collection index, and session time, but no random source or provider. It
runs after defaults, the selected variant, and overrides. Explicitly overridden
target fields remain authoritative, and the completed fixture is validated by
its source schema.

### Validation

Overrides are not an escape hatch from schema validity. The completed object is
parsed by the source schema. An invalid static or callback result throws a
FixtureValidationError with path and seed context.

## Provider customization

```ts
const user = fixture(UserSchema, {
  seed: "checkout-empty-state",
  provider: myProvider,
})
```

The provider instance must honor engine-supplied randomness. A provider that uses
global `Math.random()` violates the contract.

## Deliberately excluded fluent API

v0.1 does not support:

```ts
fixture(UserSchema).seed(42)
fixture(UserSchema).many(20)
```

`fixture(UserSchema)` returns the generated value, so it cannot also be a
builder without proxies or false output types. Reusable behavior belongs on
`defineFixture()`.

## Compatibility promises

- Generated values are valid for documented supported schemas.
- Public result and override types infer from the supplied schema.
- A seed replays the same configuration on the same FixtureSmith package version.
- Exact generated values are not stable across FixtureSmith versions unless a
  release explicitly says otherwise.
- Newly unsupported or unmodellable schema constructs fail explicitly; they do
  not silently fall back to arbitrary placeholders.
