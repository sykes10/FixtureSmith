import {
  InvalidFixtureOptionsError,
  InvalidSchemaConstraintError,
  type PathSegment,
} from "./errors.js"
import type { DateNode, GenerationNode, NumberNode, StringNode } from "./ir.js"
import {
  NO_OVERRIDE,
  type FixtureCallback,
  type RuntimeOverride,
} from "./overrides.js"
import { bindProvider, type PrimitiveProvider } from "./provider.js"
import {
  createRandom,
  deriveSeed,
  resolveRootSeed,
  type NormalizedSeed,
  type SeedInput,
} from "./random.js"

export interface GenerateOptions {
  readonly index?: number
  readonly now?: Date
  readonly nullables?: NullablePolicy
  readonly optionals?: OptionalPolicy
  readonly overrides?: unknown
  readonly provider: PrimitiveProvider
  readonly seed?: SeedInput
}

export type NullablePolicy = "value" | "null"
export type OptionalPolicy = "present" | "omit"

export const DEFAULT_NOW = "2000-01-01T00:00:00.000Z"

export interface GenerationResult<T = unknown> {
  readonly now: Date
  readonly seed: NormalizedSeed
  readonly value: T
}

export function generate(
  node: GenerationNode,
  options: GenerateOptions,
): unknown {
  return generateResult(node, options).value
}

export function generateResult(
  node: GenerationNode,
  options: GenerateOptions,
): GenerationResult {
  const rootSeed = resolveRootSeed(options.seed)
  const index = options.index ?? 0
  const session = createGenerationSession(options, rootSeed)
  return {
    now: new Date(session.now),
    seed: rootSeed,
    value: generateRoot(node, options, session, index),
  }
}

export function generateMany(
  node: GenerationNode,
  count: number,
  options: GenerateOptions,
): unknown[] {
  return generateManyResult(node, count, options).value
}

export function generateManyResult(
  node: GenerationNode,
  count: number,
  options: GenerateOptions,
): GenerationResult<unknown[]> {
  assertValidFixtureCount(count)

  const rootSeed = resolveRootSeed(options.seed)
  const session = createGenerationSession(options, rootSeed)
  return {
    now: new Date(session.now),
    seed: rootSeed,
    value: Array.from({ length: count }, (_, index) =>
      generateRoot(node, options, session, index),
    ),
  }
}

interface GenerationSession {
  readonly now: number
  readonly nullables: NullablePolicy
  readonly optionals: OptionalPolicy
  readonly provider: PrimitiveProvider
  readonly rootSeed: NormalizedSeed
}

function createGenerationSession(
  options: GenerateOptions,
  rootSeed: NormalizedSeed,
): GenerationSession {
  const now = options.now ?? new Date(DEFAULT_NOW)
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new InvalidFixtureOptionsError("Fixture now must be a valid Date.")
  }

  const nullables = options.nullables ?? "value"
  if (nullables !== "value" && nullables !== "null") {
    throw new InvalidFixtureOptionsError(
      'Fixture nullables must be either "value" or "null".',
    )
  }

  const optionals = options.optionals ?? "present"
  if (optionals !== "present" && optionals !== "omit") {
    throw new InvalidFixtureOptionsError(
      'Fixture optionals must be either "present" or "omit".',
    )
  }

  return {
    now: now.getTime(),
    nullables,
    optionals,
    provider: options.provider,
    rootSeed,
  }
}

export function assertValidFixtureCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new InvalidFixtureOptionsError(
      "Fixture count must be a non-negative safe integer.",
    )
  }
}

function generateRoot(
  node: GenerationNode,
  options: GenerateOptions,
  session: GenerationSession,
  index: number,
): unknown {
  const override = Object.hasOwn(options, "overrides")
    ? options.overrides
    : NO_OVERRIDE

  return generateNode(node, session, [index], override)
}

function generateNode(
  node: GenerationNode,
  session: GenerationSession,
  path: readonly PathSegment[],
  override: RuntimeOverride,
): unknown {
  if (override !== NO_OVERRIDE) {
    if (typeof override === "function") {
      const random = createRandom(
        deriveSeed(session.rootSeed, path, "override"),
      )
      return (override as FixtureCallback<unknown>)({
        index: path[0] as number,
        now: new Date(session.now),
        path,
        seed: session.rootSeed,
        random,
        provider: bindProvider(session.provider, {
          path,
          random,
          rootSeed: session.rootSeed,
        }),
      })
    }

    if (node.kind === "optional" || node.kind === "nullable") {
      if (override === null || override === undefined) {
        return override
      }

      return generateNode(node.inner, session, path, override)
    }

    if (node.kind !== "object" || !isMergeableObject(override)) {
      return override
    }
  }

  switch (node.kind) {
    case "string": {
      const random = createRandom(deriveSeed(session.rootSeed, path))
      const context = {
        path,
        random,
        rootSeed: session.rootSeed,
      }
      const boundProvider = bindProvider(session.provider, context)
      const value =
        node.format === undefined
          ? boundProvider.string()
          : boundProvider[node.format]()

      return satisfyStringConstraints(
        value,
        node,
        random.next(),
        path,
        session.rootSeed,
      )
    }
    case "number":
      return generateNumber(
        node,
        createRandom(deriveSeed(session.rootSeed, path)).next(),
        path,
        session.rootSeed,
      )
    case "boolean":
      return createRandom(deriveSeed(session.rootSeed, path)).next() >= 0.5
    case "date":
      return generateDate(
        node,
        createRandom(deriveSeed(session.rootSeed, path)).next(),
        path,
        session.rootSeed,
      )
    case "literal":
    case "enum":
      return selectValue(
        node.values,
        createRandom(deriveSeed(session.rootSeed, path)).next(),
        path,
        session.rootSeed,
      )
    case "array": {
      const minimum =
        node.maxLength === 0 ? 0 : Math.max(node.minLength ?? 0, 1)
      const usefulMaximum = Math.max(minimum, Math.min(minimum + 2, 3))
      const maximum =
        node.maxLength === undefined
          ? usefulMaximum
          : Math.min(node.maxLength, usefulMaximum)

      if (minimum > maximum) {
        throw impossibleRange(
          "array length",
          minimum,
          maximum,
          path,
          session.rootSeed,
        )
      }

      const lengthRandom = createRandom(
        deriveSeed(session.rootSeed, path, "array-length"),
      ).next()
      const length = randomInteger(minimum, maximum, lengthRandom)

      return Array.from({ length }, (_, index) =>
        generateNode(node.element, session, [...path, index], NO_OVERRIDE),
      )
    }
    case "optional":
      return session.optionals === "omit"
        ? undefined
        : generateNode(node.inner, session, path, NO_OVERRIDE)
    case "nullable":
      return session.nullables === "null"
        ? null
        : generateNode(node.inner, session, path, NO_OVERRIDE)
    case "object": {
      const value: Record<string, unknown> = {}

      for (const { key, node: child } of node.properties) {
        const childOverride =
          isMergeableObject(override) && Object.hasOwn(override, key)
            ? override[key]
            : NO_OVERRIDE

        if (
          isOptional(child) &&
          session.optionals === "omit" &&
          childOverride === NO_OVERRIDE
        ) {
          continue
        }

        value[key] = generateNode(child, session, [...path, key], childOverride)
      }

      return value
    }
  }
}

function isOptional(node: GenerationNode): boolean {
  if (node.kind === "optional") return true
  if (node.kind === "nullable") return isOptional(node.inner)
  return false
}

function isMergeableObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value) as unknown
  return prototype === Object.prototype || prototype === null
}

const DEFAULT_NUMBER_MINIMUM = -1_000
const DEFAULT_NUMBER_MAXIMUM = 1_000
const DEFAULT_DATE_MINIMUM = Date.UTC(2000, 0, 1)
const DEFAULT_DATE_MAXIMUM = Date.UTC(2030, 0, 1)
const ONE_YEAR_MILLISECONDS = 365 * 24 * 60 * 60 * 1_000
const MINIMUM_DATE_MILLISECONDS = -8_640_000_000_000_000
const MAXIMUM_DATE_MILLISECONDS = 8_640_000_000_000_000

function generateNumber(
  node: NumberNode,
  random: number,
  path: readonly PathSegment[],
  rootSeed: NormalizedSeed,
): number {
  const schemaMinimum = node.minimum
    ? node.integer
      ? integerMinimum(node.minimum.value, node.minimum.inclusive)
      : node.minimum.inclusive
        ? node.minimum.value
        : nextUp(node.minimum.value)
    : undefined
  const schemaMaximum = node.maximum
    ? node.integer
      ? integerMaximum(node.maximum.value, node.maximum.inclusive)
      : node.maximum.inclusive
        ? node.maximum.value
        : nextDown(node.maximum.value)
    : undefined
  const [minimum, maximum] = resolveFiniteRange(
    schemaMinimum,
    schemaMaximum,
    DEFAULT_NUMBER_MINIMUM,
    DEFAULT_NUMBER_MAXIMUM,
    2_000,
  )

  if (minimum > maximum) {
    throw impossibleRange("number", minimum, maximum, path, rootSeed)
  }

  if (minimum === maximum) {
    return minimum
  }

  if (node.integer) {
    return minimum + Math.floor(random * (maximum - minimum + 1))
  }

  return minimum * (1 - random) + maximum * random
}

function generateDate(
  node: DateNode,
  random: number,
  path: readonly PathSegment[],
  rootSeed: NormalizedSeed,
): Date {
  const [minimum, maximum] = resolveFiniteRange(
    node.minimum,
    node.maximum,
    DEFAULT_DATE_MINIMUM,
    DEFAULT_DATE_MAXIMUM,
    ONE_YEAR_MILLISECONDS,
    MINIMUM_DATE_MILLISECONDS,
    MAXIMUM_DATE_MILLISECONDS,
  )

  if (minimum > maximum) {
    throw impossibleRange("date", minimum, maximum, path, rootSeed)
  }

  return new Date(minimum + Math.floor(random * (maximum - minimum + 1)))
}

function resolveFiniteRange(
  schemaMinimum: number | undefined,
  schemaMaximum: number | undefined,
  defaultMinimum: number,
  defaultMaximum: number,
  oneSidedSpan: number,
  lowerLimit = -Number.MAX_SAFE_INTEGER,
  upperLimit = Number.MAX_SAFE_INTEGER,
): readonly [number, number] {
  if (schemaMinimum === undefined && schemaMaximum === undefined) {
    return [defaultMinimum, defaultMaximum]
  }

  if (schemaMinimum !== undefined && schemaMaximum === undefined) {
    return [schemaMinimum, Math.min(upperLimit, schemaMinimum + oneSidedSpan)]
  }

  if (schemaMinimum === undefined && schemaMaximum !== undefined) {
    return [Math.max(lowerLimit, schemaMaximum - oneSidedSpan), schemaMaximum]
  }

  return [schemaMinimum as number, schemaMaximum as number]
}

function integerMinimum(value: number, inclusive: boolean): number {
  return inclusive ? Math.ceil(value) : Math.floor(value) + 1
}

function integerMaximum(value: number, inclusive: boolean): number {
  return inclusive ? Math.floor(value) : Math.ceil(value) - 1
}

function selectValue<T>(
  values: readonly T[],
  random: number,
  path: readonly PathSegment[],
  rootSeed: NormalizedSeed,
): T {
  const index = Math.floor(random * values.length)
  const selected = values[index]

  if (selected === undefined && !values.includes(undefined as T)) {
    throw new InvalidSchemaConstraintError(
      "FixtureSmith cannot select from an empty value domain.",
      path,
      rootSeed,
    )
  }

  return selected as T
}

function impossibleRange(
  kind: string,
  minimum: number,
  maximum: number,
  path: readonly PathSegment[],
  rootSeed: NormalizedSeed,
): InvalidSchemaConstraintError {
  return new InvalidSchemaConstraintError(
    `FixtureSmith cannot generate ${kind} in range ${minimum}..${maximum}.`,
    path,
    rootSeed,
  )
}

const floatBuffer = new ArrayBuffer(8)
const floatView = new DataView(floatBuffer)

function nextUp(value: number): number {
  if (value === Number.POSITIVE_INFINITY) return value
  if (Object.is(value, -0)) return Number.MIN_VALUE

  floatView.setFloat64(0, value)
  let bits = floatView.getBigUint64(0)
  bits += value >= 0 ? 1n : -1n
  floatView.setBigUint64(0, bits)
  return floatView.getFloat64(0)
}

function nextDown(value: number): number {
  if (value === Number.NEGATIVE_INFINITY) return value
  if (Object.is(value, 0)) return -Number.MIN_VALUE

  floatView.setFloat64(0, value)
  let bits = floatView.getBigUint64(0)
  bits += value > 0 ? -1n : 1n
  floatView.setBigUint64(0, bits)
  return floatView.getFloat64(0)
}

function satisfyStringConstraints(
  providerValue: string,
  node: StringNode,
  lengthRandom: number,
  path: readonly PathSegment[],
  rootSeed: NormalizedSeed,
): string {
  const formatMinimum =
    node.format === "email"
      ? 6
      : node.format === "url"
        ? 12
        : node.format === "uuid"
          ? 36
          : 1
  const minimum =
    node.maxLength === 0 ? 0 : Math.max(node.minLength ?? 0, formatMinimum)
  const defaultMaximum =
    node.format === undefined
      ? Math.max(minimum, 16)
      : Math.max(minimum, providerValue.length)
  const maximum =
    node.maxLength === undefined
      ? defaultMaximum
      : Math.min(node.maxLength, defaultMaximum)
  const targetLength =
    node.format === undefined
      ? randomInteger(minimum, maximum, lengthRandom)
      : Math.min(maximum, Math.max(minimum, providerValue.length))

  switch (node.format) {
    case "uuid":
      return providerValue
    case "email":
      return fitEmail(providerValue, targetLength)
    case "url":
      return fitUrl(providerValue, targetLength)
    case undefined:
      return fitPlainString(providerValue, targetLength)
    default:
      throw new InvalidSchemaConstraintError(
        `FixtureSmith cannot satisfy string constraints at this path.`,
        path,
        rootSeed,
      )
  }
}

function fitPlainString(value: string, targetLength: number): string {
  const source = value.length === 0 ? "x" : value
  return source
    .repeat(Math.ceil(targetLength / source.length))
    .slice(0, targetLength)
}

function fitEmail(value: string, targetLength: number): string {
  if (value.length === targetLength) {
    return value
  }

  const sourceLocalPart =
    value.split("@", 1)[0]?.replace(/[^A-Za-z0-9_+-]/g, "") || "user"
  const domain = targetLength >= 14 ? "@example.test" : "@b.co"
  const localLength = targetLength - domain.length
  return fitPlainString(sourceLocalPart, localLength) + domain
}

function fitUrl(value: string, targetLength: number): string {
  if (value.length === targetLength) {
    return value
  }

  if (value.length < targetLength) {
    return `${value}/${"a".repeat(targetLength - value.length - 1)}`
  }

  const base = "https://a.co"
  if (targetLength === base.length) {
    return base
  }

  return `${base}/${"a".repeat(targetLength - base.length - 1)}`
}

function randomInteger(
  minimum: number,
  maximum: number,
  random: number,
): number {
  return minimum + Math.floor(random * (maximum - minimum + 1))
}
