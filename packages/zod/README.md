# @fixturesmith/zod

Generate valid, typed, deterministic fixtures from supported Zod schemas.

```ts
import { defineFixture, fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  email: z.email(),
  age: z.number().int().min(18).max(100),
})

const user = fixture(User, { seed: 42 })
const users = fixture.many(User, 20, { seed: 42 })

const userDefinition = defineFixture(User, {
  defaults: { age: 30 },
  variants: {
    senior: { age: 65 },
  },
})

const senior = userDefinition.create({ variant: "senior" })
```

Compose definitions into named application states with `defineFixtureSet`. Every
fixture in one scenario shares a single seed, session time, and provider:

```ts
import { defineFixtureSet } from "@fixturesmith/zod"

const app = defineFixtureSet({
  fixtures: { user: userDefinition },
  scenarios: {
    team: ({ create }) => ({
      lead: create("user", { variant: "senior" }),
      members: create.many("user", 3),
    }),
  },
})

const team = app.createScenario("team", { seed: 42 })
```

See the [FixtureSmith repository](https://github.com/sykes10/FixtureSmith) for
overrides, scenarios, supported schemas, determinism guarantees, and
limitations.
