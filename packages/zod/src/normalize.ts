import {
  InvalidSchemaConstraintError,
  UnsupportedSchemaError,
  type GenerationNode,
  type NumberNode,
  type PathSegment,
  type StringFormat,
} from "@fixturesmith/core"
import type { z } from "zod"

interface ZodDefinition {
  readonly type: string
  readonly shape?: Readonly<Record<string, z.ZodType>>
  readonly checks?: readonly ZodCheck[]
  readonly element?: z.ZodType
  readonly entries?: Readonly<Record<string, string | number>>
  readonly innerType?: z.ZodType
  readonly values?: readonly unknown[]
}

interface ZodCheck {
  readonly _zod: {
    readonly def: {
      readonly check: string
      readonly inclusive?: boolean
      readonly length?: number
      readonly maximum?: number
      readonly minimum?: number
      readonly value?: unknown
    }
  }
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
      assertAllowedChecks(
        definition.checks ?? [],
        new Set(["min_length", "max_length", "length_equals", "string_format"]),
        "string",
        path,
      )
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
    case "number": {
      const numberSchema = schema as z.ZodNumber
      if (numberSchema.format !== null && numberSchema.format !== "safeint") {
        throw new UnsupportedSchemaError(
          `number format ${numberSchema.format}`,
          path,
        )
      }
      const boundaries = normalizeNumberChecks(definition.checks ?? [], path)

      return {
        kind: "number",
        sourceKind: definition.type,
        integer: numberSchema.isInt,
        ...boundaries,
      }
    }
    case "boolean":
      assertAllowedChecks(definition.checks ?? [], new Set(), "boolean", path)
      return { kind: "boolean", sourceKind: definition.type }
    case "date": {
      assertAllowedChecks(
        definition.checks ?? [],
        new Set(["greater_than", "less_than"]),
        "date",
        path,
      )
      const dateSchema = schema as z.ZodDate
      return {
        kind: "date",
        sourceKind: definition.type,
        ...(dateSchema.minDate === null
          ? {}
          : { minimum: dateSchema.minDate.getTime() }),
        ...(dateSchema.maxDate === null
          ? {}
          : { maximum: dateSchema.maxDate.getTime() }),
      }
    }
    case "literal":
      assertAllowedChecks(definition.checks ?? [], new Set(), "literal", path)
      return {
        kind: "literal",
        sourceKind: definition.type,
        values: definition.values ?? [],
      }
    case "enum":
      assertAllowedChecks(definition.checks ?? [], new Set(), "enum", path)
      return {
        kind: "enum",
        sourceKind: definition.type,
        values: Object.values(definition.entries ?? {}),
      }
    case "array": {
      if (definition.element === undefined) {
        throw new UnsupportedSchemaError(definition.type, path)
      }

      const lengths = normalizeArrayChecks(definition.checks ?? [], path)
      validateArrayConstraints(lengths.minLength, lengths.maxLength, path)

      return {
        kind: "array",
        sourceKind: definition.type,
        element: normalizeZodSchema(definition.element, [...path, 0]),
        ...lengths,
      }
    }
    case "optional":
    case "nullable": {
      if (definition.innerType === undefined) {
        throw new UnsupportedSchemaError(definition.type, path)
      }

      return {
        kind: definition.type,
        sourceKind: definition.type,
        inner: normalizeZodSchema(definition.innerType, path),
      }
    }
    case "object": {
      assertAllowedChecks(definition.checks ?? [], new Set(), "object", path)
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

function assertAllowedChecks(
  checks: readonly ZodCheck[],
  allowed: ReadonlySet<string>,
  sourceKind: string,
  path: readonly PathSegment[],
): void {
  const unsupported = checks.find((check) => !allowed.has(check._zod.def.check))
  if (unsupported !== undefined) {
    throw new UnsupportedSchemaError(
      `${sourceKind} check ${unsupported._zod.def.check}`,
      path,
    )
  }
}

function normalizeArrayChecks(
  checks: readonly ZodCheck[],
  path: readonly PathSegment[],
): { minLength?: number; maxLength?: number } {
  let minimum: number | undefined
  let maximum: number | undefined

  for (const check of checks) {
    const checkDefinition = check._zod.def

    switch (checkDefinition.check) {
      case "min_length":
        minimum = checkDefinition.minimum
        break
      case "max_length":
        maximum = checkDefinition.maximum
        break
      case "length_equals":
        minimum = checkDefinition.length
        maximum = checkDefinition.length
        break
      default:
        throw new UnsupportedSchemaError(
          `array check ${checkDefinition.check}`,
          path,
        )
    }
  }

  return {
    ...(minimum === undefined ? {} : { minLength: minimum }),
    ...(maximum === undefined ? {} : { maxLength: maximum }),
  }
}

function validateArrayConstraints(
  minimum: number | undefined,
  maximum: number | undefined,
  path: readonly PathSegment[],
): void {
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new InvalidSchemaConstraintError(
      `Array minimum length ${minimum} exceeds maximum length ${maximum}.`,
      path,
    )
  }
}

function normalizeNumberChecks(
  checks: readonly ZodCheck[],
  path: readonly PathSegment[],
): Pick<NumberNode, "minimum" | "maximum"> {
  let minimum: { value: number; inclusive: boolean } | undefined
  let maximum: { value: number; inclusive: boolean } | undefined

  for (const check of checks) {
    const checkDefinition = check._zod.def

    switch (checkDefinition.check) {
      case "greater_than":
        minimum = {
          value: checkDefinition.value as number,
          inclusive: checkDefinition.inclusive ?? false,
        }
        break
      case "less_than":
        maximum = {
          value: checkDefinition.value as number,
          inclusive: checkDefinition.inclusive ?? false,
        }
        break
      case "number_format":
        break
      default:
        throw new UnsupportedSchemaError(
          `number check ${checkDefinition.check}`,
          path,
        )
    }
  }

  return {
    ...(minimum === undefined ? {} : { minimum }),
    ...(maximum === undefined ? {} : { maximum }),
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
