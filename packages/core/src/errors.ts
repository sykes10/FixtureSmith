import type { NormalizedSeed } from "./random.js"

export type PathSegment = string | number

export abstract class FixtureError extends Error {
  abstract readonly code: string

  constructor(
    message: string,
    readonly path: readonly PathSegment[] = [],
    readonly seed?: NormalizedSeed,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = new.target.name
  }
}

export class InvalidFixtureOptionsError extends FixtureError {
  readonly code = "INVALID_FIXTURE_OPTIONS"
}

export class InvalidSchemaConstraintError extends FixtureError {
  readonly code = "INVALID_SCHEMA_CONSTRAINT"
}

export class FixtureValidationError extends FixtureError {
  readonly code = "FIXTURE_VALIDATION"

  constructor(
    message: string,
    path: readonly PathSegment[],
    seed: NormalizedSeed,
    readonly issues: readonly unknown[],
    cause: unknown,
  ) {
    super(message, path, seed, { cause })
  }
}

export class ProviderError extends FixtureError {
  readonly code = "PROVIDER_ERROR"

  constructor(
    readonly operation: string,
    path: readonly PathSegment[],
    seed: NormalizedSeed,
    cause: unknown,
  ) {
    super(
      `Fixture provider operation ${operation} failed at ${formatPath(path)}. Seed: ${seed}.`,
      path,
      seed,
      { cause },
    )
  }
}

export class UnsupportedSchemaError extends FixtureError {
  readonly code = "UNSUPPORTED_SCHEMA"

  constructor(
    readonly sourceKind: string,
    path: readonly PathSegment[],
  ) {
    super(
      `FixtureSmith cannot generate ${sourceKind} at ${formatPath(path)}. Use a documented supported schema construct.`,
      path,
    )
  }
}

export function formatPath(path: readonly PathSegment[]): string {
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`
    }

    return /^[A-Za-z_$][\w$]*$/.test(segment)
      ? `${formatted}.${segment}`
      : `${formatted}[${JSON.stringify(segment)}]`
  }, "$")
}
