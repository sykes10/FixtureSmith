import {
  generate,
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

export function fixture<S extends z.ZodType>(
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
