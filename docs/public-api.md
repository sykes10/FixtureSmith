# v0.1 public API contract

This document defines the proposed v0.1 TypeScript API. Names can change before
the first implementation lands, but implementation should not begin with the
contradictory value-and-builder behavior shown in the exploratory PRD examples.

## Imports

Application code uses the Zod facade:

```ts
import { fixture, FixtureError } from "@fixturesmith/zod"
```

Advanced consumers can import provider and engine contracts from their owning
packages. Internal IR types should remain public only when needed to build an
adapter; avoid exposing implementation details prematurely.

## Generate one value

```ts
function fixture<S extends z.ZodType>(
  schema: S,
  overrides?: FixtureOverrides<z.output<S>>,
  options?: FixtureOptions,
): z.output<S>
```

Examples:

```ts
const user = fixture(UserSchema)

const admin = fixture(UserSchema, {
  role: "admin",
})

const replayed = fixture(UserSchema, undefined, {
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
  overrides?: FixtureOverrides<z.output<S>>,
  options?: FixtureOptions,
): Array<z.output<S>>
```

```ts
const users = fixture.many(UserSchema, 20, {
  role: "member",
}, {
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
interface FixtureOptions {
  seed?: SeedInput
  provider?: PrimitiveProvider
}

type SeedInput = number | string
```

Seed normalization is defined in [Determinism](determinism.md). Additional modes
such as boundary, sparse, invalid, and custom time are not part of v0.1.

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
  role: "admin",
  profile: {
    displayName: "Ada",
  },
})
```

Only `profile.displayName` is supplied. Other `profile` fields are generated.

### Callback override

```ts
const users = fixture.many(UserSchema, 3, {
  email: ({ index, provider }) =>
    `user-${index}-${provider.uuid()}@example.test`,
}, { seed: 42 })
```

The callback API should expose a narrow deterministic context:

```ts
interface FixtureCallbackContext {
  readonly index: number
  readonly path: readonly (string | number)[]
  readonly seed: NormalizedSeed
  readonly random: RandomSource
  readonly provider: BoundPrimitiveProvider
}
```

`provider` is bound to the current scoped random source, so callbacks do not pass
context manually. Sibling values are deliberately absent in v0.1 because they
would create field-order and partial-object semantics.

### Override precedence

v0.1 has two applicable layers:

1. Per-call override
2. Schema-derived or provider-generated value

The fuller precedence chain in the PRD becomes relevant with `defineFixture()`
and scenarios in later releases.

### Validation

Overrides are not an escape hatch from schema validity. The completed object is
parsed by the source schema. An invalid static or callback result throws a
FixtureValidationError with path and seed context.

## Provider customization

```ts
const user = fixture(UserSchema, undefined, {
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
builder without proxies or false output types. Fluent reusable behavior belongs
on the later `defineFixture()` API.

## Compatibility promises

- Generated values are valid for documented supported schemas.
- Public result and override types infer from the supplied schema.
- A seed replays the same configuration on the same FixtureSmith package version.
- Exact generated values are not stable across FixtureSmith versions unless a
  release explicitly says otherwise.
- Newly unsupported or unmodellable schema constructs fail explicitly; they do
  not silently fall back to arbitrary placeholders.
