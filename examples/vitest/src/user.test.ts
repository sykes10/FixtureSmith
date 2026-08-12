import { fixture } from "@fixturesmith/zod"
import { expect, it } from "vitest"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  email: z.email(),
  age: z.number().int().min(18),
})

it("replays a valid user from the failure seed", () => {
  const first = fixture(User, { seed: "checkout-regression" })
  const replay = fixture(User, { seed: "checkout-regression" })

  expect(User.safeParse(first).success).toBe(true)
  expect(replay).toEqual(first)
})
