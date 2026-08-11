# FixtureSmith

FixtureSmith is a schema-first TypeScript fixture engine for generating valid,
typed, and reproducible application data.

> Faker generates fake values. FixtureSmith generates reproducible application
> states.

## Project status

FixtureSmith is in pre-implementation design. The first release is deliberately
narrow: Zod schemas become valid deterministic fixtures with typed overrides,
collection generation, and Faker-backed semantic primitives.

The examples below describe the agreed v0.1 API; they are not implemented yet.

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

## Documentation

- [Product requirements](fixturesmith-prd.md)
- [Engineering documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Public API contract](docs/public-api.md)
- [Schema support](docs/schema-support.md)
- [Determinism](docs/determinism.md)
- [Errors and diagnostics](docs/errors.md)
- [Testing strategy](docs/testing-strategy.md)
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

The PRD recommends a permissive license. The repository must add an explicit
license before its first public release.
