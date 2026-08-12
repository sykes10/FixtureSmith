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

See the [FixtureSmith repository](https://github.com/sykes10/FixtureSmith) for
overrides, supported schemas, determinism guarantees, and limitations.
