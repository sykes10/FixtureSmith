import {
  assertValidFixtureCount,
  generate,
  generateMany,
  type FixtureCallback,
  type PrimitiveProvider,
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
  const generated = generate(node, {
    provider: options.provider ?? new FakerProvider(),
    ...(overrides === undefined ? {} : { overrides }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })

  return schema.parse(generated) as z.output<S>
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
  const generated = generateMany(node, count, {
    provider: options.provider ?? new FakerProvider(),
    ...(overrides === undefined ? {} : { overrides }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })

  return generated.map((value) => schema.parse(value) as z.output<S>)
}

export const fixture: FixtureFunction = Object.assign(createFixture, {
  many: createManyFixtures,
})
