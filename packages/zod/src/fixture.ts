import {
  generate,
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

export function fixture<S extends z.ZodType>(
  schema: S,
  _overrides?: undefined,
  options: FixtureOptions = {},
): z.output<S> {
  const node = normalizeZodSchema(schema)
  const generated = generate(node, {
    provider: options.provider ?? new FakerProvider(),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  })

  return schema.parse(generated) as z.output<S>
}
