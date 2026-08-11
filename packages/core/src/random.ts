import { InvalidFixtureOptionsError, type PathSegment } from "./errors.js"

declare const normalizedSeedBrand: unique symbol

export type SeedInput = number | string
export type NormalizedSeed = number & {
  readonly [normalizedSeedBrand]: true
}

export interface RandomSource {
  next(): number
  uint32(): number
}

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

export function normalizeSeed(seed: SeedInput): NormalizedSeed {
  if (typeof seed === "number" && !Number.isFinite(seed)) {
    throw new InvalidFixtureOptionsError(
      "Fixture seed must be a finite number or string.",
    )
  }

  const encoded =
    typeof seed === "number"
      ? `number:${Object.is(seed, -0) ? "-0" : String(seed)}`
      : `string:${seed}`

  return hash(encoded) as NormalizedSeed
}

export function resolveRootSeed(seed?: SeedInput): NormalizedSeed {
  if (seed !== undefined) {
    return normalizeSeed(seed)
  }

  const entropy = new Uint32Array(1)
  globalThis.crypto.getRandomValues(entropy)
  return entropy[0] as NormalizedSeed
}

export function deriveSeed(
  rootSeed: NormalizedSeed,
  path: readonly PathSegment[],
  purpose = "node-value",
): NormalizedSeed {
  let state = hash(`purpose:${purpose}`, rootSeed)

  for (const segment of path) {
    const encoded =
      typeof segment === "number"
        ? `index:${segment}`
        : `field:${segment.length}:${segment}`
    state = hash(encoded, state)
  }

  return state as NormalizedSeed
}

export function createRandom(seed: NormalizedSeed): RandomSource {
  let state = seed >>> 0

  return {
    next(): number {
      return nextUint32() / 0x1_0000_0000
    },
    uint32(): number {
      return nextUint32()
    },
  }

  function nextUint32(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return (value ^ (value >>> 14)) >>> 0
  }
}

function hash(value: string, initial = FNV_OFFSET): number {
  let result = initial >>> 0

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    result = Math.imul(result ^ (codeUnit & 0xff), FNV_PRIME)
    result = Math.imul(result ^ (codeUnit >>> 8), FNV_PRIME)
  }

  return result >>> 0
}
