import {
  UnsupportedSchemaError,
  type GenerationNode,
  type PathSegment,
} from "@fixturesmith/core"
import type { z } from "zod"

interface ZodDefinition {
  readonly type: string
  readonly shape?: Readonly<Record<string, z.ZodType>>
}

interface ZodInternals {
  readonly _zod: {
    readonly def: ZodDefinition
  }
}

export function normalizeZodSchema(
  schema: z.ZodType,
  path: readonly PathSegment[] = [],
): GenerationNode {
  const definition = (schema as unknown as ZodInternals)._zod.def

  switch (definition.type) {
    case "string":
      return { kind: "string", sourceKind: definition.type }
    case "object": {
      if (definition.shape === undefined) {
        throw new UnsupportedSchemaError(definition.type, path)
      }

      return {
        kind: "object",
        sourceKind: definition.type,
        properties: Object.entries(definition.shape).map(([key, child]) => ({
          key,
          node: normalizeZodSchema(child, [...path, key]),
        })),
      }
    }
    default:
      throw new UnsupportedSchemaError(definition.type, path)
  }
}
