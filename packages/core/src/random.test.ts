import { describe, expect, it } from "vitest"

import { createRandom, deriveSeed, normalizeSeed } from "./random.js"

describe("deterministic random sources", () => {
  it("replays the same sequence from the same seed", () => {
    const seed = normalizeSeed("checkout-empty-state")
    const first = createRandom(seed)
    const second = createRandom(seed)

    expect([first.next(), first.next(), first.uint32()]).toEqual([
      second.next(),
      second.next(),
      second.uint32(),
    ])
  })

  it("distinguishes numeric and string seeds", () => {
    expect(normalizeSeed(42)).not.toBe(normalizeSeed("42"))
  })

  it("derives independent field paths", () => {
    const root = normalizeSeed(42)

    expect(deriveSeed(root, [0, "name"])).not.toBe(
      deriveSeed(root, [0, "email"]),
    )
  })
})
