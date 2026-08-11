import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"

import { fixture } from "./fixture.js"

describe("fixture", () => {
  const User = z.object({
    name: z.string(),
    profile: z.object({
      displayName: z.string(),
    }),
  })

  it("generates a value accepted by its schema", () => {
    const user = fixture(User, undefined, { seed: 42 })

    expect(User.safeParse(user).success).toBe(true)
    expect(user.name).not.toHaveLength(0)
    expect(user.profile.displayName).not.toHaveLength(0)
  })

  it("replays the same complete object from the same seed", () => {
    expect(fixture(User, undefined, { seed: 42 })).toEqual(
      fixture(User, undefined, { seed: 42 }),
    )
  })

  it("infers the Zod output type", () => {
    const user = fixture(User, undefined, { seed: 42 })

    expectTypeOf(user).toEqualTypeOf<z.output<typeof User>>()
  })
})
