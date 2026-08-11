import {
  createRandom,
  deriveSeed,
  normalizeSeed,
  type ProviderContext,
} from "@fixturesmith/core"
import { describe, expect, it } from "vitest"

import { FakerProvider } from "./faker-provider.js"

describe("FakerProvider", () => {
  const provider = new FakerProvider()

  it.each(["string", "email", "url", "uuid"] as const)(
    "replays %s from the same scoped random source",
    (operation) => {
      expect(provider[operation](context(42, operation))).toBe(
        provider[operation](context(42, operation)),
      )
    },
  )

  it("returns valid semantic primitives", () => {
    const email = provider.email(context(1, "email"))
    const url = provider.url(context(1, "url"))
    const uuid = provider.uuid(context(1, "uuid"))

    expect(email).toMatch(/^[^@]+@[^@]+\.[^@]+$/)
    expect(() => new URL(url)).not.toThrow()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(provider.string(context(1, "string"))).not.toHaveLength(0)
  })
})

function context(seedInput: number, field: string): ProviderContext {
  const rootSeed = normalizeSeed(seedInput)
  const path = [0, field] as const
  return {
    path,
    random: createRandom(deriveSeed(rootSeed, path)),
    rootSeed,
  }
}
