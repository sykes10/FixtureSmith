import type { PathSegment } from "./errors.js"
import type { NormalizedSeed, RandomSource } from "./random.js"

export interface ProviderContext {
  readonly path: readonly PathSegment[]
  readonly random: RandomSource
  readonly rootSeed: NormalizedSeed
}

export interface PrimitiveProvider {
  string(context: ProviderContext): string
}
