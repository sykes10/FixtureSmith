# FixtureSmith

[![CI](https://github.com/sykes10/FixtureSmith/actions/workflows/ci.yml/badge.svg)](https://github.com/sykes10/FixtureSmith/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-0786bd.svg)](LICENSE)
[![Node.js 22.18+](https://img.shields.io/badge/Node.js-22.18%2B-339933.svg)](package.json)

[Documentation](https://sykes10.github.io/FixtureSmith/) ·
[Runnable examples](examples/) ·
[Open in StackBlitz](https://stackblitz.com/github/sykes10/FixtureSmith?file=examples/basic/src/index.ts&startScript=demo%3Abasic)

FixtureSmith is a schema-first TypeScript fixture engine for generating valid,
typed, and reproducible application data.

> Faker generates fake values. FixtureSmith generates reproducible application
> states.

## Status

FixtureSmith is preparing for its first package release. It turns supported Zod
schemas into valid deterministic fixtures, supports reusable definitions with
typed defaults, variants, and derivation, and composes them into named scenarios
that produce whole application states.

## Install

FixtureSmith is ESM-only and requires Node.js 22.18 or newer.

```sh
pnpm add -D @fixturesmith/zod zod
```

## Quick start

```ts
import { defineFixture, fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  age: z.number().int().min(18).max(100),
})

const user = fixture(User, { seed: 42 })
const admin = fixture(User, {
  seed: 42,
  overrides: { name: "Ada" },
})
const users = fixture.many(User, 20, { seed: 42 })

const userDefinition = defineFixture(User, {
  defaults: { age: 30 },
  variants: {
    senior: { age: 65 },
  },
})

const senior = userDefinition.create({ seed: 42, variant: "senior" })
```

Every generated result is parsed by its source schema. The same FixtureSmith
version, schema, configuration, provider, and seed reproduce the same complete
value.

### Callback overrides

Callbacks receive deterministic scoped randomness, a bound provider, the shared
session time, the field path, and the collection item index:

```ts
const users = fixture.many(
  User,
  3,
  {
    seed: "users",
    overrides: {
      email: ({ index, provider }) =>
        `user-${index}-${provider.uuid()}@example.test`,
    },
  },
)
```

Overrides remain subject to the source schema. Invalid output throws a structured
`FixtureValidationError` containing the normalized reproduction seed and path.

### Scenarios

A fixture set composes definitions into named application states. Every fixture
in one scenario shares a single seed, session time, and provider:

```ts
import { defineFixtureSet } from "@fixturesmith/zod"

const commerce = defineFixtureSet({
  fixtures: { customer, order },
  scenarios: {
    customerWithOrders: ({ create }) => {
      const account = create("customer", { variant: "pro" })
      return {
        account,
        orders: create.many("order", 3, {
          overrides: { customerId: account.id },
        }),
      }
    },
  },
})

const state = commerce.createScenario("customerWithOrders", { seed: 42 })
```

The whole state replays from its seed, and a test can override any fixture by
name without rewriting the recipe. See the
[scenarios guide](docs/guides/scenarios.md).

## Why FixtureSmith

Faker is the primitive-value catalogue underneath FixtureSmith; it does not know
your application's schema. Hand-written factories know the schema, but usually
duplicate it and require every irrelevant field to be maintained. FixtureSmith
walks the supported parts of the schema, delegates realistic primitives to
Faker, and lets each test override only the fields that express its intent.

## Runnable demos

| Demo | What it proves |
| --- | --- |
| [Basic](examples/basic/) | Generate one typed fixture and a deterministic collection. |
| [Overrides](examples/overrides/) | Merge a deep override and derive fields from the item index. |
| [Scenarios](examples/scenarios/) | Build one coherent application state from a fixture set. |
| [Vitest](examples/vitest/) | Replay the same fixture inside a real test. |
| [Custom provider](examples/custom-provider/) | Replace Faker while retaining deterministic randomness. |

```sh
pnpm examples:check
```

Every demo is type-checked and executed in CI. The documentation site imports
the same source files, so its examples cannot silently drift from the API.

## Documentation

- [Product requirements](fixturesmith-prd.md)
- [Engineering documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Public API contract](docs/public-api.md)
- [Schema support](docs/schema-support.md)
- [Determinism](docs/determinism.md)
- [Errors and diagnostics](docs/errors.md)
- [Testing strategy](docs/testing-strategy.md)
- [Custom providers](docs/providers.md)
- [Release readiness](docs/release-readiness.md)
- [Release process](docs/releasing.md)
- [GitHub repository setup](docs/github-setup.md)
- [Architecture decisions](docs/decisions/README.md)

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), review
the [schema support matrix](docs/schema-support.md), and include a changeset for
published behavior or declaration changes.

## Current boundaries

Included:

- Zod object generation with a documented supported node set
- Recursive nested objects and arrays
- Constraint-aware primitive values
- Typed static and callback overrides
- Seeded deterministic generation
- A provider abstraction and Faker-backed provider
- Actionable errors containing schema paths
- Reusable fixture definitions with defaults and one selected variant
- Pure cross-field derivation
- Stable session time and explicit optional/nullable policies
- Fixture sets and multi-fixture scenarios with per-test overrides

Deferred:

- Relations and graph generation
- MSW, Storybook, Playwright, and database adapters
- Unusual-data modes
- JSON Schema and OpenAPI
- CLI, AI generation, and GUI tooling

## License

[MIT](LICENSE)
