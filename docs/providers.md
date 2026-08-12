# Custom providers

FixtureSmith core owns randomness and constraint satisfaction. A primitive
provider supplies realistic source values for plain strings, email addresses,
URLs, and UUIDs.

Applications normally use the Faker provider wired into `@fixturesmith/zod`.
Pass a custom provider only when a project needs a smaller dependency, a specific
locale, or domain-specific source values.

```ts
import type { PrimitiveProvider } from "@fixturesmith/core"
import { fixture } from "@fixturesmith/zod"

const provider: PrimitiveProvider = {
  string: ({ random }) => `value-${random.uint32()}`,
  email: ({ random }) => `user-${random.uint32()}@example.test`,
  url: ({ random }) => `https://example.test/${random.uint32()}`,
  uuid: ({ random }) => {
    const value = random.uint32().toString(16).padStart(8, "0")
    return `${value}-0000-4000-8000-000000000000`
  },
}

const value = fixture(Schema, undefined, {
  provider,
  seed: 42,
})
```

## Contract

Each method receives a `ProviderContext` containing:

- the normalized root seed,
- the typed logical field path,
- a random source scoped to that operation.

A conforming provider:

- consumes only the supplied random source,
- does not call `Math.random()` or read wall-clock time,
- returns a syntactically valid value for semantic operations,
- does not mutate a process-global provider singleton,
- permits the same scoped source to replay the same value.

The engine may resize plain strings or supported semantic values to satisfy Zod
constraints. Impossible combinations fail explicitly. Provider exceptions are
wrapped in `ProviderError` with operation, field path, seed, and original cause.

Callback overrides receive a `BoundPrimitiveProvider`. Its methods take no
context because FixtureSmith has already bound them to the callback's scoped
random source.
