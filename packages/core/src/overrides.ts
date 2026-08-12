import type { PathSegment } from "./errors.js"
import type { BoundPrimitiveProvider } from "./provider.js"
import type { NormalizedSeed, RandomSource } from "./random.js"

export interface FixtureCallbackContext {
  readonly index: number
  readonly now: Date
  readonly path: readonly PathSegment[]
  readonly seed: NormalizedSeed
  readonly random: RandomSource
  readonly provider: BoundPrimitiveProvider
}

export type FixtureCallback<T> = (context: FixtureCallbackContext) => T

export const NO_OVERRIDE: unique symbol = Symbol("NO_OVERRIDE")
export type RuntimeOverride = unknown | typeof NO_OVERRIDE
