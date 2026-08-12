import { defineFixture, fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  name: z.string().min(2).max(40),
  email: z.email(),
  age: z.number().int().min(18).max(100),
  role: z.enum(["admin", "member"]),
})

const user = fixture(User, {
  overrides: { role: "admin" },
  seed: "readme-demo",
})
const users = fixture.many(User, 3, { seed: "team-demo" })

const userDefinition = defineFixture(User, {
  defaults: { role: "member" },
  variants: {
    admin: { role: "admin" },
  },
})
const reusableAdmin = userDefinition.create({
  seed: "reusable-admin",
  variant: "admin",
})

console.log("One fixture:", user)
console.log("Three fixtures:", users)
console.log("Reusable admin fixture:", reusableAdmin)
