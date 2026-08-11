import { InvalidSchemaConstraintError, type PathSegment } from "./errors.js"
import type { GenerationNode, StringNode } from "./ir.js"
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
    case "object":
      return Object.fromEntries(
        node.properties.map(({ key, node: child }) => [
          key,
          generateNode(child, provider, rootSeed, [...path, key]),
        ]),
      )
  }
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
