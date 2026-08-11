import {
  InvalidSchemaConstraintError,
  UnsupportedSchemaError,
} from "@fixturesmith/core"
import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"

import { fixture } from "./fixture.js"

describe("fixture", () => {
  const User = z.object({
    name: z.string(),
    profile: z.object({
      displayName: z.string(),
    }),
  })

  it("generates a value accepted by its schema", () => {
    const user = fixture(User, undefined, { seed: 42 })

    expect(User.safeParse(user).success).toBe(true)
    expect(user.name).not.toHaveLength(0)
    expect(user.profile.displayName).not.toHaveLength(0)
  })

  it("replays the same complete object from the same seed", () => {
    expect(fixture(User, undefined, { seed: 42 })).toEqual(
      fixture(User, undefined, { seed: 42 }),
    )
  })

  it("infers the Zod output type", () => {
    const user = fixture(User, undefined, { seed: 42 })

    expectTypeOf(user).toEqualTypeOf<z.output<typeof User>>()
  })

  it.each(Array.from({ length: 20 }, (_, seed) => seed))(
    "generates constrained semantic strings for seed %s",
    (seed) => {
      const Schema = z.object({
        email: z.email().length(24),
        homepage: z.url().length(20),
        id: z.uuid().length(36),
        name: z.string().min(8).max(12),
      })

      const value = fixture(Schema, undefined, { seed })

      expect(Schema.safeParse(value).success).toBe(true)
      expect(value.email).toHaveLength(24)
      expect(value.homepage).toHaveLength(20)
      expect(value.id).toHaveLength(36)
      expect(value.name.length).toBeGreaterThanOrEqual(8)
      expect(value.name.length).toBeLessThanOrEqual(12)
    },
  )

  it("replays semantic strings from the same seed", () => {
    const Schema = z.object({
      email: z.email(),
      homepage: z.url(),
      id: z.uuid(),
    })

    expect(fixture(Schema, undefined, { seed: "semantic" })).toEqual(
      fixture(Schema, undefined, { seed: "semantic" }),
    )
  })

  it("supports string-attached semantic formats", () => {
    const Schema = z.object({ email: z.string().email() })

    expect(
      Schema.safeParse(fixture(Schema, undefined, { seed: 42 })).success,
    ).toBe(true)
  })

  it("generates the empty string when it is the only valid length", () => {
    const Schema = z.object({ empty: z.string().length(0) })

    expect(fixture(Schema, undefined, { seed: 42 })).toEqual({ empty: "" })
  })

  it("rejects impossible string constraints with their path", () => {
    const Schema = z.object({ id: z.uuid().max(35) })

    expect(() => fixture(Schema, undefined, { seed: 42 })).toThrowError(
      expect.objectContaining({
        code: "INVALID_SCHEMA_CONSTRAINT",
        path: ["id"],
      }) as InvalidSchemaConstraintError,
    )
  })

  it("rejects unsupported string formats with their path", () => {
    const Schema = z.object({ address: z.ipv4() })

    expect(() => fixture(Schema, undefined, { seed: 42 })).toThrowError(
      expect.objectContaining({
        code: "UNSUPPORTED_SCHEMA",
        path: ["address"],
      }) as UnsupportedSchemaError,
    )
  })

  it.each(Array.from({ length: 20 }, (_, seed) => seed))(
    "generates remaining primitive nodes for seed %s",
    (seed) => {
      const Schema = z.object({
        active: z.boolean(),
        count: z.number().int().min(-4).max(4),
        createdAt: z
          .date()
          .min(new Date("2024-01-01T00:00:00.000Z"))
          .max(new Date("2024-12-31T23:59:59.999Z")),
        mode: z.literal("ready"),
        ratio: z.number().gt(0).lt(1),
        role: z.enum(["admin", "member", "viewer"]),
      })

      const value = fixture(Schema, undefined, { seed })

      expect(Schema.safeParse(value).success).toBe(true)
      expect(Number.isInteger(value.count)).toBe(true)
      expect(value.mode).toBe("ready")
      expect(value.ratio).toBeGreaterThan(0)
      expect(value.ratio).toBeLessThan(1)
    },
  )

  it("supports exact numeric and date boundaries", () => {
    const instant = new Date("2025-05-06T07:08:09.000Z")
    const Schema = z.object({
      count: z.number().int().min(7).max(7),
      instant: z.date().min(instant).max(instant),
      value: z.number().min(3.5).max(3.5),
    })

    expect(fixture(Schema, undefined, { seed: 42 })).toEqual({
      count: 7,
      instant,
      value: 3.5,
    })
  })

  it("rejects integer ranges containing no integer", () => {
    const Schema = z.object({ value: z.number().int().gt(1).lt(2) })

    expect(() => fixture(Schema, undefined, { seed: 42 })).toThrowError(
      expect.objectContaining({
        code: "INVALID_SCHEMA_CONSTRAINT",
        path: [0, "value"],
      }) as InvalidSchemaConstraintError,
    )
  })

  it("rejects unsupported numeric checks", () => {
    const Schema = z.object({ value: z.number().multipleOf(5) })

    expect(() => fixture(Schema, undefined, { seed: 42 })).toThrowError(
      expect.objectContaining({
        code: "UNSUPPORTED_SCHEMA",
        path: ["value"],
      }) as UnsupportedSchemaError,
    )
  })
})
