import { InvalidSchemaConstraintError, type PathSegment } from "./errors.js"
import type { DateNode, GenerationNode, NumberNode, StringNode } from "./ir.js"
import type { PrimitiveProvider } from "./provider.js"
import {
  createRandom,
  deriveSeed,
  resolveRootSeed,
  type NormalizedSeed,
  type SeedInput,
} from "./random.js"

export interface GenerateOptions {
  readonly provider: PrimitiveProvider
  readonly seed?: SeedInput
}

export function generate(
  node: GenerationNode,
  options: GenerateOptions,
): unknown {
  const rootSeed = resolveRootSeed(options.seed)
  return generateNode(node, options.provider, rootSeed, [0])
}

function generateNode(
  node: GenerationNode,
  provider: PrimitiveProvider,
  rootSeed: NormalizedSeed,
  path: readonly PathSegment[],
): unknown {
  switch (node.kind) {
    case "string": {
      const random = createRandom(deriveSeed(rootSeed, path))
      const context = {
        path,
        random,
        rootSeed,
      }
      const value =
        node.format === undefined
          ? provider.string(context)
          : provider[node.format](context)

      return satisfyStringConstraints(
        value,
        node,
        random.next(),
        path,
        rootSeed,
      )
    }
    case "number":
      return generateNumber(
        node,
        createRandom(deriveSeed(rootSeed, path)).next(),
        path,
        rootSeed,
      )
    case "boolean":
      return createRandom(deriveSeed(rootSeed, path)).next() >= 0.5
    case "date":
      return generateDate(
        node,
        createRandom(deriveSeed(rootSeed, path)).next(),
        path,
        rootSeed,
      )
    case "literal":
    case "enum":
      return selectValue(
        node.values,
        createRandom(deriveSeed(rootSeed, path)).next(),
        path,
        rootSeed,
      )
    case "object":
      return Object.fromEntries(
        node.properties.map(({ key, node: child }) => [
          key,
          generateNode(child, provider, rootSeed, [...path, key]),
        ]),
      )
  }
}

const DEFAULT_NUMBER_MINIMUM = -1_000
const DEFAULT_NUMBER_MAXIMUM = 1_000
const DEFAULT_DATE_MINIMUM = Date.UTC(2000, 0, 1)
const DEFAULT_DATE_MAXIMUM = Date.UTC(2030, 0, 1)
const ONE_YEAR_MILLISECONDS = 365 * 24 * 60 * 60 * 1_000

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
): readonly [number, number] {
  if (schemaMinimum === undefined && schemaMaximum === undefined) {
    return [defaultMinimum, defaultMaximum]
  }

  if (schemaMinimum !== undefined && schemaMaximum === undefined) {
    return [
      schemaMinimum,
      Math.min(Number.MAX_SAFE_INTEGER, schemaMinimum + oneSidedSpan),
    ]
  }

  if (schemaMinimum === undefined && schemaMaximum !== undefined) {
    return [
      Math.max(-Number.MAX_SAFE_INTEGER, schemaMaximum - oneSidedSpan),
      schemaMaximum,
    ]
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
  const maximum = node.maxLength ?? defaultMaximum
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
