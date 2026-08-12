import { InvalidFixtureOptionsError } from "@fixturesmith/core"
import type { z } from "zod"

import {
  createFixtureValue,
  createManyFixtureValues,
  type FixtureOptions,
  type FixtureOverrides,
} from "./fixture.js"
import { clone, isPlainObject, mergeValues, snapshot } from "./merge.js"

type AtomicFixtureValue = Date | readonly unknown[]

export type FixturePartial<T> = T extends AtomicFixtureValue
  ? T
  : T extends object
    ? { [K in keyof T]?: FixturePartial<T[K]> }
    : T

export type ReadonlyFixture<T> = T extends Date
  ? Date
  : T extends readonly (infer U)[]
    ? readonly ReadonlyFixture<U>[]
    : T extends object
      ? { readonly [K in keyof T]: ReadonlyFixture<T[K]> }
      : T

export interface FixtureDerivationContext<T> {
  readonly index: number
  readonly now: Date
  readonly value: ReadonlyFixture<T>
}

export type FixtureDerivation<T> = T extends AtomicFixtureValue
  ? never
  : T extends object
    ? (context: FixtureDerivationContext<T>) => FixturePartial<T>
    : never

export type FixtureVariants<T, V extends string = string> = Readonly<
  Record<V, FixtureOverrides<T>>
>

export interface FixtureDefinitionBaseConfig<S extends z.ZodType> {
  readonly defaults?: FixtureOverrides<z.output<S>>
  readonly derive?: FixtureDerivation<z.output<S>>
}

export type FixtureDefinitionConfig<
  S extends z.ZodType,
  V extends string = never,
> = FixtureDefinitionBaseConfig<S> &
  ([V] extends [never]
    ? { readonly variants?: never }
    : { readonly variants: FixtureVariants<z.output<S>, V> })

export interface DefinedFixtureOptions<
  S extends z.ZodType,
  V extends string,
> extends FixtureOptions<S> {
  readonly variant?: V
}

export interface FixtureDefinition<S extends z.ZodType, V extends string> {
  create(options?: DefinedFixtureOptions<S, V>): z.output<S>
  many(count: number, options?: DefinedFixtureOptions<S, V>): Array<z.output<S>>
}

export function defineFixture<S extends z.ZodType>(
  schema: S,
): FixtureDefinition<S, never>
export function defineFixture<S extends z.ZodType>(
  schema: S,
  config: FixtureDefinitionConfig<S>,
): FixtureDefinition<S, never>
export function defineFixture<S extends z.ZodType, const V extends string>(
  schema: S,
  config: FixtureDefinitionConfig<S, V>,
): FixtureDefinition<S, V>
export function defineFixture<
  S extends z.ZodType,
  const V extends string = string,
>(
  schema: S,
  config: FixtureDefinitionBaseConfig<S> & {
    readonly variants?: FixtureVariants<z.output<S>, V>
  } = {},
): FixtureDefinition<S, V> {
  const defaults: OverrideLayer = {
    present: Object.hasOwn(config, "defaults"),
    value: snapshot(config.defaults),
  }
  const variants = snapshot(config.variants ?? {}) as FixtureVariants<
    z.output<S>,
    V
  >
  const derive = config.derive

  const definition: FixtureDefinition<S, V> = {
    create(options = {}) {
      const resolved = resolveOptions(options, defaults, variants)
      return createFixtureValue(
        schema,
        resolved.options,
        createDerivationTransform(derive, resolved.explicitOverrides),
      )
    },
    many(count, options = {}) {
      const resolved = resolveOptions(options, defaults, variants)
      return createManyFixtureValues(
        schema,
        count,
        resolved.options,
        createDerivationTransform(derive, resolved.explicitOverrides),
      )
    },
  }

  return Object.freeze(definition)
}

function resolveOptions<S extends z.ZodType, V extends string>(
  options: DefinedFixtureOptions<S, V>,
  defaults: OverrideLayer,
  variants: FixtureVariants<z.output<S>, V>,
): {
  readonly explicitOverrides: OverrideLayer
  readonly options: FixtureOptions<S>
} {
  const variant = options.variant
  if (variant !== undefined && !Object.hasOwn(variants, variant)) {
    throw new InvalidFixtureOptionsError(
      `Unknown fixture variant ${JSON.stringify(variant)}.`,
    )
  }

  const variantLayer: OverrideLayer = {
    present: variant !== undefined,
    value: variant === undefined ? undefined : variants[variant],
  }
  const explicitOverrides: OverrideLayer = {
    present: Object.hasOwn(options, "overrides"),
    value: options.overrides,
  }
  const merged = mergeOverrideLayers([
    defaults,
    variantLayer,
    explicitOverrides,
  ])

  return {
    explicitOverrides,
    options: {
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.nullables === undefined
        ? {}
        : { nullables: options.nullables }),
      ...(options.optionals === undefined
        ? {}
        : { optionals: options.optionals }),
      ...(merged.present ? { overrides: clone(merged.value) as never } : {}),
      ...(options.provider === undefined ? {} : { provider: options.provider }),
      ...(options.seed === undefined ? {} : { seed: options.seed }),
    },
  }
}

interface OverrideLayer {
  readonly present: boolean
  readonly value: unknown
}

function mergeOverrideLayers(layers: readonly OverrideLayer[]): OverrideLayer {
  let merged: OverrideLayer = { present: false, value: undefined }

  for (const layer of layers) {
    if (!layer.present) continue
    merged = {
      present: true,
      value: merged.present
        ? mergeValues(merged.value, layer.value)
        : layer.value,
    }
  }

  return merged
}

function createDerivationTransform<T>(
  derive: FixtureDerivation<T> | undefined,
  explicitOverrides: OverrideLayer,
): ((value: T, index: number, now: Date) => unknown) | undefined {
  if (derive === undefined) return undefined

  return (value, index, now) => {
    const derived = derive({
      index,
      now: new Date(now),
      value: snapshot(value) as ReadonlyFixture<T>,
    })
    const withDerivation = mergeValues(value, derived)
    return explicitOverrides.present
      ? preserveOverrideTargets(withDerivation, value, explicitOverrides.value)
      : withDerivation
  }
}

function preserveOverrideTargets(
  target: unknown,
  provisional: unknown,
  overrides: unknown,
): unknown {
  if (!isPlainObject(overrides)) return provisional
  if (!isPlainObject(target) || !isPlainObject(provisional)) return target

  const result: Record<string, unknown> = { ...target }
  for (const key of Object.keys(overrides)) {
    result[key] = preserveOverrideTargets(
      target[key],
      provisional[key],
      overrides[key],
    )
  }
  return result
}
