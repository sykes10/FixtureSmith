import {
  InvalidSchemaConstraintError,
  UnsupportedSchemaError,
  type GenerationNode,
  type PathSegment,
  type StringFormat,
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
    case "string": {
      const stringSchema = schema as z.ZodString
      const minimum = stringSchema.minLength ?? undefined
      const maximum = stringSchema.maxLength ?? undefined
      const format = normalizeStringFormat(stringSchema.format, path)

      validateStringConstraints(minimum, maximum, format, path)

      return {
        kind: "string",
        sourceKind: definition.type,
        ...(format === undefined ? {} : { format }),
        ...(minimum === undefined ? {} : { minLength: minimum }),
        ...(maximum === undefined ? {} : { maxLength: maximum }),
      }
    }
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

function normalizeStringFormat(
  format: string | null,
  path: readonly PathSegment[],
): StringFormat | undefined {
  switch (format) {
    case null:
      return undefined
    case "email":
    case "url":
    case "uuid":
      return format
    default:
      throw new UnsupportedSchemaError(`string format ${format}`, path)
  }
}

function validateStringConstraints(
  minimum: number | undefined,
  maximum: number | undefined,
  format: StringFormat | undefined,
  path: readonly PathSegment[],
): void {
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new InvalidSchemaConstraintError(
      `String minimum length ${minimum} exceeds maximum length ${maximum}.`,
      path,
    )
  }

  const lowerBound = minimum ?? 0
  const upperBound = maximum ?? Number.POSITIVE_INFINITY
  const requiredLength =
    format === "uuid"
      ? 36
      : format === "email"
        ? 6
        : format === "url"
          ? 12
          : undefined

  if (
    requiredLength !== undefined &&
    (upperBound < requiredLength ||
      (format === "uuid" && lowerBound > requiredLength))
  ) {
    throw new InvalidSchemaConstraintError(
      `${format} cannot satisfy string length range ${lowerBound}..${upperBound}.`,
      path,
    )
  }
}
