import { FixtureError, ProviderError, type PathSegment } from "./errors.js"
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
    email: () => callProvider("email", () => provider.email(context), context),
    string: () =>
      callProvider("string", () => provider.string(context), context),
    url: () => callProvider("url", () => provider.url(context), context),
    uuid: () => callProvider("uuid", () => provider.uuid(context), context),
  }
}

function callProvider<T>(
  operation: string,
  callback: () => T,
  context: ProviderContext,
): T {
  try {
    return callback()
  } catch (error) {
    if (error instanceof FixtureError) throw error
    throw new ProviderError(operation, context.path, context.rootSeed, error)
  }
}
