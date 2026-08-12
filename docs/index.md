---
layout: home

hero:
  name: FixtureSmith
  text: Deterministic fixtures from your schemas
  tagline: Generate valid typed Zod data, override only what matters, and replay every test state from a seed.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/
    - theme: alt
      text: View examples
      link: /guides/examples
    - theme: alt
      text: GitHub
      link: https://github.com/sykes10/FixtureSmith

features:
  - title: Schema-first
    details: Generated values are parsed by their source Zod schema before they are returned.
  - title: Reproducible
    details: A path-derived PRNG keeps the same schema, configuration, provider, and seed deterministic.
  - title: Intentional overrides
    details: Deep typed overrides let a test specify its business state without maintaining unrelated fields.
  - title: Reusable definitions
    details: Typed defaults, variants, and derivation capture domain intent once without duplicating schemas.
  - title: Whole application states
    details: Fixture sets compose definitions into named scenarios that replay a coherent multi-fixture state from one seed.
  - title: Provider-powered
    details: Faker supplies realistic primitives behind a small replaceable provider contract.
---

## One schema, complete fixtures

```ts
import { defineFixture, fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  email: z.email(),
  age: z.number().int().min(18).max(100),
})

const user = fixture(User, { seed: "docs" })

const reusableUser = defineFixture(User, {
  defaults: { age: 30 },
})
```

FixtureSmith is currently preparing its first `0.1.0` release. The supported
surface and deliberate boundaries are recorded in the
[schema compatibility matrix](./schema-support.md).
