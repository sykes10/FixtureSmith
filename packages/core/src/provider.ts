import type { PathSegment } from "./errors.js"
import type { NormalizedSeed, RandomSource } from "./random.js"

export interface ProviderContext {
  readonly path: readonly PathSegment[]
  readonly random: RandomSource
  readonly rootSeed: NormalizedSeed
}

export interface PrimitiveProvider {
  email(context: ProviderContext): string
  string(context: ProviderContext): string
  url(context: ProviderContext): string
  uuid(context: ProviderContext): string
}

export interface BoundPrimitiveProvider {
  email(): string
  string(): string
  url(): string
  uuid(): string
}

export function bindProvider(
  provider: PrimitiveProvider,
  context: ProviderContext,
): BoundPrimitiveProvider {
  return {
    email: () => provider.email(context),
    string: () => provider.string(context),
    url: () => provider.url(context),
    uuid: () => provider.uuid(context),
  }
}
