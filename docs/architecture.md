# Architecture

## Objective

The architecture must make this path excellent:

```text
Zod schema -> valid typed fixture
```

It also supports reusable fixture definitions while leaving clean seams for
later scenarios, relations, and adapters.

## Package topology

```text
packages/
  core/
    src/
      errors.ts        Shared typed errors
      generate.ts      Sessions, policies, and recursive IR interpreter
      ir.ts            Schema-neutral generation nodes
      overrides.ts     Runtime override representation
      provider.ts      Primitive provider contract
      random.ts        Seed normalization and scoped PRNG
      index.ts         Public exports

  provider-faker/
    src/
      faker-provider.ts
      index.ts

  zod/
    src/
      define-fixture.ts     Reusable definition facade
      define-fixture-set.ts Fixture sets and scenario sessions
      fixture.ts            Typed public facade
      merge.ts              Shared override merge and snapshot helpers
      normalize.ts          Zod schema -> core IR
      index.ts
```

Tests should live beside the package they exercise. Cross-package consumer and
acceptance tests can live under a root `tests/` directory.

## Dependency direction

```text
@fixturesmith/core
       ^
       |
@fixturesmith/provider-faker
       ^
       |
@fixturesmith/zod ------> zod (peer dependency)
```

More precisely:

- `core` has no dependency on Zod, Faker, or an integration framework.
- `provider-faker` depends on `core` and Faker.
- `zod` depends on `core` and the default Faker provider, and declares Zod as a
  peer dependency. It owns the typed public `fixture()`, `defineFixture()`, and
  `defineFixtureSet()` facades.
- The Zod package is the convenience entrypoint and wires the default provider,
  so first use requires no provider configuration.

If bundling the default provider makes the package unacceptably large, measure
before changing this decision. Zero-configuration behavior is an MVP goal.

## Generation pipeline

```text
fixture(schema, { overrides, ...options })
  1. Normalize Zod schema into core IR
  2. Create generation session from root seed and options
  3. Walk IR recursively
  4. Resolve an override or generate each node
  5. Ask provider for semantic primitives where applicable
  6. Parse the result with the original Zod schema
  7. Return Zod's inferred output type
```

Normalization and generation are separate phases. Core must not inspect Zod
objects, and the Zod adapter must not contain the recursive value generator.

## Internal representation

The initial IR is a discriminated union. Exact TypeScript naming can evolve, but
the concepts should resemble:

```ts
type GenerationNode =
  | StringNode
  | NumberNode
  | BooleanNode
  | DateNode
  | LiteralNode
  | EnumNode
  | ObjectNode
  | ArrayNode
  | OptionalNode
  | NullableNode

interface BaseNode {
  kind: string
  sourceKind: string
}

interface ObjectNode extends BaseNode {
  kind: "object"
  properties: ReadonlyArray<{
    key: string
    node: GenerationNode
  }>
}
```

Constraints are normalized data, not executable Zod checks. Examples include
minimum, inclusive/exclusive maximum, integer, exact length, and semantic format.
The source kind is retained for useful adapter errors.

Do not put these in the core IR:

- fixture definitions or scenarios
- graph relations
- lifecycle hooks
- integration-specific metadata
- arbitrary executable validation functions
- abstractions required only by a hypothetical second schema adapter

## Generation context

Every recursive call receives an immutable or logically immutable context:

```ts
interface GenerationContext {
  readonly now: Date
  readonly rootSeed: Seed
  readonly path: readonly PathSegment[]
  readonly random: RandomSource
  readonly provider: PrimitiveProvider
  readonly options: ResolvedGenerationOptions
}
```

Descending into a field or collection item derives a child context. Path
segments are field names and numeric indexes. Context must never use implicit
global randomness or the wall clock. A session also resolves optional and
nullable policies once before recursive generation.

## Provider boundary

The engine owns constraint satisfaction. Providers supply realistic semantic
values and general primitive fallbacks.

```ts
interface PrimitiveProvider {
  string(context: ProviderContext): string
  email(context: ProviderContext): string
  uuid(context: ProviderContext): string
  url(context: ProviderContext): string
}
```

The contract covers semantic and general string values only. Numbers, booleans,
and dates are calculated by the engine from normalized constraints, because
their realism comes from the schema's bounds rather than from a catalogue. New
operations are added only when a value's realism cannot come from constraints
alone.

Every provider operation receives engine-controlled scoped randomness. Providers
must not silently seed or consume a global singleton.

Constraint application belongs either before or after provider calls according
to the value type, but the final generated value must satisfy all supported
constraints. For example, a provider may make an email while the engine enforces
string length compatibility and reports impossible combinations.

## Validation boundary

The Zod facade parses every generated result before returning it. This catches
adapter and provider defects and applies any explicitly supported Zod output
behavior. A parse failure is wrapped as a FixtureValidationError containing the
root seed and relevant Zod issues.

Validation is a safety net, not a retry strategy for opaque refinements. The
adapter must reject constructs it cannot model predictably.

## Caching

Schema normalization may later be cached in a `WeakMap` keyed by schema object.
Do not add caching until profiling shows value. If introduced, normalized plans
must be immutable and cache behavior must not affect random output.

## Extension points

The intended later layering is:

```text
schema adapter -> IR -> generated value
                       ^
defineFixture ---------|
scenario ---------------|
graph engine ------------|
                       |
integration adapters consume results
```

Future features should compose around the engine and its context rather than
adding Zod-specific behavior to core.
