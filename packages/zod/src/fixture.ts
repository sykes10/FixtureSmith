import {
  assertValidFixtureCount,
  FixtureValidationError,
  generateManyResult,
  generateResult,
  type NullablePolicy,
  type OptionalPolicy,
  type FixtureCallback,
  type PrimitiveProvider,
  type NormalizedSeed,
  type PathSegment,
  type SeedInput,
} from "@fixturesmith/core"
import { FakerProvider } from "@fixturesmith/provider-faker"
import { z } from "zod"

import { normalizeZodSchema } from "./normalize.js"

type AtomicFixtureValue = Date | readonly unknown[]
type FixtureValueOverride<T> = T | FixtureCallback<T>

export type FixtureOverrides<T> = T extends AtomicFixtureValue
  ? FixtureValueOverride<T>
  : T extends object
    ? | { [K in keyof T]?: FixtureOverrides<T[K]> | FixtureCallback<T[K]> }
      | FixtureCallback<T>
    : FixtureValueOverride<T>

export interface FixtureOptions<S extends z.ZodType> {
  readonly now?: Date
  readonly nullables?: NullablePolicy
  readonly optionals?: OptionalPolicy
  readonly overrides?: FixtureOverrides<z.output<S>>
  readonly provider?: PrimitiveProvider
  readonly seed?: SeedInput
}

export interface FixtureFunction {
  <S extends z.ZodType>(schema: S, options?: FixtureOptions<S>): z.output<S>

  many<S extends z.ZodType>(
    schema: S,
    count: number,
    options?: FixtureOptions<S>,
  ): Array<z.output<S>>
}

function createFixture<S extends z.ZodType>(
  schema: S,
  options: FixtureOptions<S> = {},
): z.output<S> {
  return createFixtureValue(schema, options)
}

export function createFixtureValue<S extends z.ZodType>(
  schema: S,
  options: FixtureOptions<S> = {},
  transform?: FixtureTransform<z.output<S>>,
): z.output<S> {
  const node = normalizeZodSchema(schema)
  const result = generateResult(node, {
    provider: options.provider ?? new FakerProvider(),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.nullables === undefined
      ? {}
      : { nullables: options.nullables }),
    ...(options.optionals === undefined
      ? {}
      : { optionals: options.optionals }),
    ...(Object.hasOwn(options, "overrides")
      ? { overrides: options.overrides }
      : {}),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })

  const value = transform
    ? transform(result.value as z.output<S>, 0, new Date(result.now))
    : result.value

  return parseFixture(schema, value, result.seed)
}

function createManyFixtures<S extends z.ZodType>(
  schema: S,
  count: number,
  options: FixtureOptions<S> = {},
): Array<z.output<S>> {
  return createManyFixtureValues(schema, count, options)
}

export function createManyFixtureValues<S extends z.ZodType>(
  schema: S,
  count: number,
  options: FixtureOptions<S> = {},
  transform?: FixtureTransform<z.output<S>>,
): Array<z.output<S>> {
  assertValidFixtureCount(count)
  if (count === 0) return []

  const node = normalizeZodSchema(schema)
  const result = generateManyResult(node, count, {
    provider: options.provider ?? new FakerProvider(),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.nullables === undefined
      ? {}
      : { nullables: options.nullables }),
    ...(options.optionals === undefined
      ? {}
      : { optionals: options.optionals }),
    ...(Object.hasOwn(options, "overrides")
      ? { overrides: options.overrides }
      : {}),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })

  return result.value.map((value, index) => {
    const transformed = transform
      ? transform(value as z.output<S>, index, new Date(result.now))
      : value
    return parseFixture(schema, transformed, result.seed, [index])
  })
}

export type FixtureTransform<T> = (
  value: T,
  index: number,
  now: Date,
) => unknown

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
