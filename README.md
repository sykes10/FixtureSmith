# FixtureSmith

FixtureSmith is a schema-first TypeScript fixture engine for generating valid,
typed, and reproducible application data.

> Faker generates fake values. FixtureSmith generates reproducible application
> states.

## Status

FixtureSmith v0.1 is implemented and preparing for its first package release. It
turns supported Zod schemas into valid deterministic fixtures with typed
overrides, collection generation, and Faker-backed semantic primitives.

## Install

FixtureSmith is ESM-only and requires Node.js 22.18 or newer.

```sh
pnpm add -D @fixturesmith/zod zod
```

## Quick start

```ts
import { fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  age: z.number().int().min(18).max(100),
})

const user = fixture(User, undefined, { seed: 42 })
const admin = fixture(User, { name: "Ada" }, { seed: 42 })
const users = fixture.many(User, 20, undefined, { seed: 42 })
```

Every generated result is parsed by its source schema. The same FixtureSmith
version, schema, configuration, provider, and seed reproduce the same complete
value.

### Callback overrides

Callbacks receive deterministic scoped randomness, a bound provider, the field
path, and the collection item index:

```ts
const users = fixture.many(
  User,
  3,
  {
    email: ({ index, provider }) =>
      `user-${index}-${provider.uuid()}@example.test`,
  },
  { seed: "users" },
)
```

Overrides remain subject to the source schema. Invalid output throws a structured
`FixtureValidationError` containing the normalized reproduction seed and path.

## Why FixtureSmith

Faker is the primitive-value catalogue underneath FixtureSmith; it does not know
your application's schema. Hand-written factories know the schema, but usually
duplicate it and require every irrelevant field to be maintained. FixtureSmith
walks the supported parts of the schema, delegates realistic primitives to
Faker, and lets each test override only the fields that express its intent.

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
- [v0.1 release readiness](docs/release-readiness.md)
- [Release process](docs/releasing.md)
- [MVP implementation plan](docs/implementation/mvp-plan.md)
- [Architecture decisions](docs/decisions/README.md)

## v0.1 boundaries

Included:

- Zod object generation with a documented supported node set
- Recursive nested objects and arrays
- Constraint-aware primitive values
- Typed static and callback overrides
- Seeded deterministic generation
- A provider abstraction and Faker-backed provider
- Actionable errors containing schema paths

Deferred:

- Named fixtures and scenarios
- Relations and graph generation
- MSW, Storybook, Playwright, and database adapters
- Invalid or boundary-data modes
- JSON Schema and OpenAPI
- CLI, AI generation, and GUI tooling

## License

[MIT](LICENSE)
