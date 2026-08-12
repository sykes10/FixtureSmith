# @fixturesmith/zod

Generate valid, typed, deterministic fixtures from supported Zod schemas.

```ts
import { fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  email: z.email(),
  age: z.number().int().min(18).max(100),
})

const user = fixture(User, { seed: 42 })
const users = fixture.many(User, 20, { seed: 42 })
```

See the [FixtureSmith repository](https://github.com/sykes10/FixtureSmith) for
overrides, supported schemas, determinism guarantees, and limitations.
