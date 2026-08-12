import { z } from "zod"

import { fixture } from "../src/index.js"

declare function expectType<T>(value: T): void

const User = z.object({
  email: z.email(),
  profile: z.object({
    displayName: z.string(),
    website: z.url().nullable(),
  }),
  roles: z.array(z.enum(["admin", "member"])),
})

const user = fixture(User, {
  overrides: {
    email: ({ index, provider }) =>
      `user-${index}-${provider.uuid()}@example.test`,
    profile: {
      displayName: "Ada",
    },
    roles: ["admin"],
  },
})

expectType<z.output<typeof User>>(user)
expectType<Array<z.output<typeof User>>>(fixture.many(User, 3))

fixture.many(User, 3, {
  overrides: { email: ({ index }) => `user-${index}@example.test` },
})

fixture(User, {
  overrides: { profile: { website: null } },
})

// @ts-expect-error overrides must be nested under the named options property
fixture(User, { email: "member@example.test" })

// @ts-expect-error the legacy positional override and options API is rejected
fixture(User, { overrides: { email: "member@example.test" } }, { seed: 42 })

// @ts-expect-error unknown override fields are rejected
fixture(User, { overrides: { unknown: "value" } })

// @ts-expect-error static override values must match schema output
fixture(User, { overrides: { email: 42 } })

// @ts-expect-error callback results must match the field output
fixture(User, { overrides: { email: () => 42 } })

// @ts-expect-error array members must match the schema output
fixture(User, { overrides: { roles: ["owner"] } })

// @ts-expect-error collection overrides retain field types
fixture.many(User, 3, { overrides: { email: 42 } })
