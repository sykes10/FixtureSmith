import type { PathSegment } from "./errors.js"
import type { GenerationNode } from "./ir.js"
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
    case "string":
      return provider.string({
        path,
        random: createRandom(deriveSeed(rootSeed, path)),
        rootSeed,
      })
    case "object":
      return Object.fromEntries(
        node.properties.map(({ key, node: child }) => [
          key,
          generateNode(child, provider, rootSeed, [...path, key]),
        ]),
      )
  }
}
