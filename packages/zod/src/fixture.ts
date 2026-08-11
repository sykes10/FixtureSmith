import {
  assertValidFixtureCount,
  FixtureValidationError,
  generateManyResult,
  generateResult,
  type FixtureCallback,
  type PrimitiveProvider,
  type NormalizedSeed,
  type PathSegment,
  type SeedInput,
} from "@fixturesmith/core"
import { FakerProvider } from "@fixturesmith/provider-faker"
import { z } from "zod"

import { normalizeZodSchema } from "./normalize.js"

export interface FixtureOptions {
  readonly provider?: PrimitiveProvider
  readonly seed?: SeedInput
}

type AtomicFixtureValue = Date | readonly unknown[]
type FixtureValueOverride<T> = T | FixtureCallback<T>

export type FixtureOverrides<T> = T extends AtomicFixtureValue
  ? FixtureValueOverride<T>
  : T extends object
    ? | { [K in keyof T]?: FixtureOverrides<T[K]> | FixtureCallback<T[K]> }
      | FixtureCallback<T>
    : FixtureValueOverride<T>

export interface FixtureFunction {
  <S extends z.ZodType>(
    schema: S,
    overrides?: FixtureOverrides<z.output<S>>,
    options?: FixtureOptions,
  ): z.output<S>

  many<S extends z.ZodType>(
    schema: S,
    count: number,
    overrides?: FixtureOverrides<z.output<S>>,
    options?: FixtureOptions,
  ): Array<z.output<S>>
}

function createFixture<S extends z.ZodType>(
  schema: S,
  overrides?: FixtureOverrides<z.output<S>>,
  options: FixtureOptions = {},
): z.output<S> {
  const node = normalizeZodSchema(schema)
  const result = generateResult(node, {
    provider: options.provider ?? new FakerProvider(),
    ...(overrides === undefined ? {} : { overrides }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })

  return parseFixture(schema, result.value, result.seed)
}

function createManyFixtures<S extends z.ZodType>(
  schema: S,
  count: number,
  overrides?: FixtureOverrides<z.output<S>>,
  options: FixtureOptions = {},
): Array<z.output<S>> {
  assertValidFixtureCount(count)
  if (count === 0) return []

  const node = normalizeZodSchema(schema)
  const result = generateManyResult(node, count, {
    provider: options.provider ?? new FakerProvider(),
    ...(overrides === undefined ? {} : { overrides }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })

  return result.value.map((value, index) =>
    parseFixture(schema, value, result.seed, [index]),
  )
}

export const fixture: FixtureFunction = Object.assign(createFixture, {
  many: createManyFixtures,
})

function parseFixture<S extends z.ZodType>(
  schema: S,
  value: unknown,
  seed: NormalizedSeed,
  pathPrefix: readonly PathSegment[] = [],
): z.output<S> {
  const result = schema.safeParse(value)
  if (result.success) return result.data as z.output<S>

  const issuePath = result.error.issues[0]?.path ?? []
  const path: PathSegment[] = [
    ...pathPrefix,
    ...issuePath.map((segment) =>
      typeof segment === "symbol" ? String(segment) : segment,
    ),
  ]

  throw new FixtureValidationError(
    `Generated fixture failed schema validation. Seed: ${seed}.`,
    path,
    seed,
    result.error.issues,
    result.error,
  )
}
