import { fixture } from "@fixturesmith/zod"
import { z } from "zod"

const Account = z.object({
  id: z.uuid(),
  profile: z.object({
    displayName: z.string(),
    homepage: z.url(),
  }),
  email: z.email(),
})

const accounts = fixture.many(
  Account,
  3,
  {
    profile: { displayName: "Ada" },
    email: ({ index }) => `user-${index}@example.test`,
  },
  { seed: 42 },
)

console.log(accounts)
