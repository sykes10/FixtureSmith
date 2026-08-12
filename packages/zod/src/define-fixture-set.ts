import {
  DEFAULT_NOW,
  deriveSeed,
  InvalidFixtureOptionsError,
  resolveRootSeed,
  type NormalizedSeed,
  type NullablePolicy,
  type OptionalPolicy,
  type PrimitiveProvider,
  type SeedInput,
} from "@fixturesmith/core"
import { FakerProvider } from "@fixturesmith/provider-faker"
import type { z } from "zod"

import type { FixtureDefinition } from "./define-fixture.js"
import type { FixtureOverrides } from "./fixture.js"
import { clone, mergeValues } from "./merge.js"

export type AnyFixtureDefinition = FixtureDefinition<z.ZodType, string>

export type FixtureDefinitionRecord = Readonly<
  Record<string, AnyFixtureDefinition>
>

export type FixtureDefinitionOutput<D extends AnyFixtureDefinition> =
  ReturnType<D["create"]>

export type FixtureDefinitionVariant<D extends AnyFixtureDefinition> =
  NonNullable<NonNullable<Parameters<D["create"]>[0]>["variant"]>

export interface ScenarioCreateOptions<D extends AnyFixtureDefinition> {
  readonly overrides?: FixtureOverrides<FixtureDefinitionOutput<D>>
  readonly variant?: FixtureDefinitionVariant<D>
}

export interface ScenarioCreate<F extends FixtureDefinitionRecord> {
  <K extends keyof F & string>(
    name: K,
    options?: ScenarioCreateOptions<F[K]>,
  ): FixtureDefinitionOutput<F[K]>

  many<K extends keyof F & string>(
    name: K,
    count: number,
    options?: ScenarioCreateOptions<F[K]>,
  ): Array<FixtureDefinitionOutput<F[K]>>
}

export interface ScenarioContext<F extends FixtureDefinitionRecord> {
  readonly create: ScenarioCreate<F>
  readonly now: Date
  readonly seed: NormalizedSeed
}

export type ScenarioRecipe<F extends FixtureDefinitionRecord, R = unknown> = (
  context: ScenarioContext<F>,
) => R

export type ScenarioRecord<F extends FixtureDefinitionRecord> = Readonly<
  Record<string, ScenarioRecipe<F>>
>

export type FixtureSetOverrides<F extends FixtureDefinitionRecord> = {
  readonly [K in keyof F]?: FixtureOverrides<FixtureDefinitionOutput<F[K]>>
}

export interface CreateScenarioOptions<F extends FixtureDefinitionRecord> {
  readonly now?: Date
  readonly nullables?: NullablePolicy
  readonly optionals?: OptionalPolicy
  readonly overrides?: FixtureSetOverrides<F>
  readonly provider?: PrimitiveProvider
  readonly seed?: SeedInput
}

export interface FixtureSetConfig<
  F extends FixtureDefinitionRecord,
  S extends ScenarioRecord<F>,
> {
  readonly fixtures: F
  readonly scenarios: S
}

export interface FixtureSet<
  F extends FixtureDefinitionRecord,
  S extends ScenarioRecord<F>,
> {
  readonly fixtures: F
  createScenario<K extends keyof S & string>(
    name: K,
    options?: CreateScenarioOptions<F>,
  ): ReturnType<S[K]>
}

export function defineFixtureSet<
  F extends FixtureDefinitionRecord,
  S extends ScenarioRecord<F>,
>(config: FixtureSetConfig<F, S>): FixtureSet<F, S> {
  const fixtures = Object.freeze({ ...config.fixtures }) as F
  const scenarios = Object.freeze({ ...config.scenarios }) as S

  const set: FixtureSet<F, S> = {
    fixtures,
    createScenario(name, options = {}) {
      if (!Object.hasOwn(scenarios, name)) {
        throw new InvalidFixtureOptionsError(
          `Unknown fixture set scenario ${JSON.stringify(name)}.`,
        )
      }

      const recipe = scenarios[name] as ScenarioRecipe<F>
      return recipe(
        createScenarioContext(fixtures, name, options),
      ) as ReturnType<S[typeof name]>
    },
  }

  return Object.freeze(set)
}

interface RuntimeFixtureDefinition {
  create(options: RuntimeDefinedOptions): unknown
  many(count: number, options: RuntimeDefinedOptions): unknown[]
}

interface RuntimeDefinedOptions {
  readonly now: Date
  readonly nullables?: NullablePolicy
  readonly optionals?: OptionalPolicy
  readonly overrides?: unknown
  readonly provider: PrimitiveProvider
  readonly seed: SeedInput
  readonly variant?: string
}

function createScenarioContext<F extends FixtureDefinitionRecord>(
  fixtures: F,
  scenarioName: string,
  options: CreateScenarioOptions<F>,
): ScenarioContext<F> {
  const rootSeed = resolveRootSeed(options.seed)
  const now = options.now ?? new Date(DEFAULT_NOW)
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new InvalidFixtureOptionsError("Fixture now must be a valid Date.")
  }

  const provider = options.provider ?? new FakerProvider()
  const setOverrides = options.overrides
  let nextCall = 0

  function resolveCall<K extends keyof F & string>(
    name: K,
    callOptions: ScenarioCreateOptions<F[K]> | undefined,
  ): {
    readonly definition: RuntimeFixtureDefinition
    readonly options: RuntimeDefinedOptions
  } {
    if (!Object.hasOwn(fixtures, name)) {
      throw new InvalidFixtureOptionsError(
        `Unknown fixture set fixture ${JSON.stringify(name)}.`,
      )
    }

    const callIndex = nextCall
    nextCall += 1

    let overrides: unknown
    let hasOverrides = false
    if (callOptions !== undefined && Object.hasOwn(callOptions, "overrides")) {
      overrides = callOptions.overrides
      hasOverrides = true
    }
    if (setOverrides !== undefined && Object.hasOwn(setOverrides, name)) {
      const scenarioOverride = setOverrides[name]
      overrides = hasOverrides
        ? mergeValues(overrides, scenarioOverride)
        : scenarioOverride
      hasOverrides = true
    }

    return {
      definition: fixtures[name] as unknown as RuntimeFixtureDefinition,
      options: {
        now: new Date(now),
        provider,
        seed: deriveSeed(
          rootSeed,
          [scenarioName, callIndex, name],
          "scenario-fixture",
        ),
        ...(options.nullables === undefined
          ? {}
          : { nullables: options.nullables }),
        ...(options.optionals === undefined
          ? {}
          : { optionals: options.optionals }),
        ...(hasOverrides ? { overrides: clone(overrides) } : {}),
        ...(callOptions?.variant === undefined
          ? {}
          : { variant: callOptions.variant as string }),
      },
    }
  }

  const create = <K extends keyof F & string>(
    name: K,
    callOptions?: ScenarioCreateOptions<F[K]>,
  ): FixtureDefinitionOutput<F[K]> => {
    const call = resolveCall(name, callOptions)
    return call.definition.create(call.options) as FixtureDefinitionOutput<F[K]>
  }

  const many = <K extends keyof F & string>(
    name: K,
    count: number,
    callOptions?: ScenarioCreateOptions<F[K]>,
  ): Array<FixtureDefinitionOutput<F[K]>> => {
    const call = resolveCall(name, callOptions)
    return call.definition.many(count, call.options) as Array<
      FixtureDefinitionOutput<F[K]>
    >
  }

  return Object.freeze({
    create: Object.assign(create, { many }) as ScenarioCreate<F>,
    now: new Date(now),
    seed: rootSeed,
  })
}
