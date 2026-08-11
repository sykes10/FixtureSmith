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
  email: ({ index, provider }) =>
    `user-${index}-${provider.uuid()}@example.test`,
  profile: {
    displayName: "Ada",
  },
  roles: ["admin"],
})

expectType<z.output<typeof User>>(user)

fixture(User, {
  profile: { website: null },
})

// @ts-expect-error unknown override fields are rejected
fixture(User, { unknown: "value" })

// @ts-expect-error static override values must match schema output
fixture(User, { email: 42 })

// @ts-expect-error callback results must match the field output
fixture(User, { email: () => 42 })

// @ts-expect-error array members must match the schema output
fixture(User, { roles: ["owner"] })
