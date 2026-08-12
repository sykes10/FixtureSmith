import {
  FixtureValidationError,
  InvalidSchemaConstraintError,
  ProviderError,
  UnsupportedSchemaError,
  type FixtureCallbackContext,
  type PrimitiveProvider,
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

  it("keeps permissive maximum-only collections usefully small", () => {
    const Schema = z.object({
      names: z.array(z.string()).max(1_000_000),
      text: z.string().max(1_000_000),
    })
    const value = fixture(Schema, undefined, { seed: 42 })

    expect(value.names.length).toBeLessThanOrEqual(3)
    expect(value.text.length).toBeLessThanOrEqual(16)
    expect(Schema.safeParse(value).success).toBe(true)
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

  it("keeps one-sided dates within JavaScript's valid range", () => {
    const minimum = new Date(8_639_999_999_999_000)
    const Schema = z.date().min(minimum)

    const value = fixture(Schema, undefined, { seed: 42 })

    expect(Number.isNaN(value.getTime())).toBe(false)
    expect(value.getTime()).toBeGreaterThanOrEqual(minimum.getTime())
    expect(Schema.safeParse(value).success).toBe(true)
  })

  it("rejects non-finite numeric boundaries", () => {
    const Schema = z.number().min(Number.POSITIVE_INFINITY)

    expect(() => fixture(Schema, undefined, { seed: 42 })).toThrowError(
      expect.objectContaining({
        code: "INVALID_SCHEMA_CONSTRAINT",
        path: [],
      }) as InvalidSchemaConstraintError,
    )
  })

  it("selects only valid members from numeric TypeScript enums", () => {
    enum Role {
      Admin,
      Member,
    }
    const Schema = z.object({ role: z.enum(Role) })

    for (let seed = 0; seed < 20; seed += 1) {
      expect(
        Schema.safeParse(fixture(Schema, undefined, { seed })).success,
      ).toBe(true)
    }
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

  it.each(Array.from({ length: 20 }, (_, seed) => seed))(
    "generates recursive schema nodes for seed %s",
    (seed) => {
      const Schema = z.object({
        aliases: z.array(z.string().min(2)).min(2).max(4),
        profile: z.object({
          bio: z.string().optional(),
          website: z.url().nullable(),
        }),
      })

      const value = fixture(Schema, undefined, { seed })

      expect(Schema.safeParse(value).success).toBe(true)
      expect(value.aliases.length).toBeGreaterThanOrEqual(2)
      expect(value.aliases.length).toBeLessThanOrEqual(4)
      expect(value.profile.bio).toBeTypeOf("string")
      expect(value.profile.website).toBeTypeOf("string")
    },
  )

  it("supports exact and empty array lengths", () => {
    const Schema = z.object({
      empty: z.array(z.string()).length(0),
      exact: z.array(z.number()).length(3),
    })

    const value = fixture(Schema, undefined, { seed: 42 })

    expect(value.empty).toEqual([])
    expect(value.exact).toHaveLength(3)
    expect(Schema.safeParse(value).success).toBe(true)
  })

  it("generates a representative deeply nested schema", () => {
    const Schema = z.object({
      id: z.uuid(),
      email: z.email(),
      profile: z.object({
        displayName: z.string().min(3).max(30),
        homepage: z.url().nullable(),
      }),
      orders: z
        .array(
          z.object({
            createdAt: z.date(),
            id: z.uuid(),
            status: z.enum(["pending", "paid", "failed"]),
            total: z.number().min(0).max(10_000),
          }),
        )
        .min(1)
        .max(5),
      verified: z.boolean().optional(),
    })

    const value = fixture(Schema, undefined, { seed: "acceptance" })

    expect(Schema.safeParse(value).success).toBe(true)
    expect(value.profile.homepage).not.toBeNull()
    expect(value.verified).toBeTypeOf("boolean")
  })

  it("deeply merges static object overrides", () => {
    const Schema = z.object({
      id: z.uuid(),
      profile: z.object({
        displayName: z.string(),
        website: z.url(),
      }),
      roles: z.array(z.enum(["admin", "member"])),
    })
    const generated = fixture(Schema, undefined, { seed: 42 })
    const overridden = fixture(
      Schema,
      {
        profile: { displayName: "Ada" },
        roles: ["admin"],
      },
      { seed: 42 },
    )

    expect(overridden).toMatchObject({
      id: generated.id,
      profile: {
        displayName: "Ada",
        website: generated.profile.website,
      },
      roles: ["admin"],
    })
  })

  it("runs deterministic callback overrides with scoped context", () => {
    const Schema = z.object({ email: z.email(), token: z.uuid() })
    const overrides = {
      email: ({ index, path, provider }: FixtureCallbackContext) =>
        `${index}-${path.at(-1)}-${provider.uuid()}@example.test`,
    }

    const first = fixture(Schema, overrides, { seed: 42 })
    const second = fixture(Schema, overrides, { seed: 42 })

    expect(first).toEqual(second)
    expect(first.email).toMatch(/^0-email-/)
    expect(Schema.safeParse(first).success).toBe(true)
  })

  it("supports explicit null and undefined overrides", () => {
    const Schema = z.object({
      nullable: z.string().nullable(),
      optional: z.string().optional(),
    })

    expect(
      fixture(Schema, { nullable: null, optional: undefined }, { seed: 42 }),
    ).toEqual({ nullable: null, optional: undefined })
  })

  it("generates deterministic collections", () => {
    const Schema = z.object({ id: z.uuid(), name: z.string() })

    const first = fixture.many(Schema, 100, undefined, { seed: 42 })
    const second = fixture.many(Schema, 100, undefined, { seed: 42 })

    expect(first).toEqual(second)
    expect(first).toHaveLength(100)
    expect(first.every((value) => Schema.safeParse(value).success)).toBe(true)
  })

  it("makes a single fixture equal collection item zero", () => {
    const Schema = z.object({
      id: z.uuid(),
      tags: z.array(z.string()).min(1).max(4),
    })

    expect(fixture(Schema, undefined, { seed: 42 })).toEqual(
      fixture.many(Schema, 1, undefined, { seed: 42 })[0],
    )
  })

  it("keeps shared array items stable when cardinality changes", () => {
    const Short = z.object({ tags: z.array(z.string()).length(2) })
    const Long = z.object({ tags: z.array(z.string()).length(4) })

    expect(fixture(Long, undefined, { seed: 42 }).tags.slice(0, 2)).toEqual(
      fixture(Short, undefined, { seed: 42 }).tags,
    )
  })

  it("keeps existing fields stable when a sibling is added", () => {
    const Before = z.object({ name: z.string() })
    const After = z.object({ email: z.email(), name: z.string() })

    expect(fixture(After, undefined, { seed: 42 }).name).toBe(
      fixture(Before, undefined, { seed: 42 }).name,
    )
  })

  it("passes collection indexes to callback overrides", () => {
    const Schema = z.object({ label: z.string() })

    const values = fixture.many(
      Schema,
      3,
      { label: ({ index }) => `item-${index}` },
      { seed: 42 },
    )

    expect(values).toEqual([
      { label: "item-0" },
      { label: "item-1" },
      { label: "item-2" },
    ])
  })

  it("runs callback overrides once per relevant collection field", () => {
    const Schema = z.object({ label: z.string(), untouched: z.string() })
    let invocations = 0

    fixture.many(Schema, 5, {
      label: ({ index }) => {
        invocations += 1
        return `item-${index}`
      },
    })

    expect(invocations).toBe(5)
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid collection count %s",
    (count) => {
      expect(() => fixture.many(z.string(), count)).toThrowError(
        expect.objectContaining({
          code: "INVALID_FIXTURE_OPTIONS",
          path: [],
        }) as InvalidSchemaConstraintError,
      )
    },
  )

  it("returns zero values without normalizing the schema", () => {
    expect(fixture.many(z.map(z.string(), z.string()), 0)).toEqual([])
  })

  it("wraps validation failures with path, seed, issues, and cause", () => {
    const Schema = z.object({ email: z.email() })

    try {
      fixture(Schema, { email: "invalid" as never }, { seed: 42 })
      expect.unreachable("fixture should fail validation")
    } catch (error) {
      if (!(error instanceof FixtureValidationError)) throw error

      expect(error).toMatchObject({
        code: "FIXTURE_VALIDATION",
        path: ["email"],
      })
      expect(error.seed).toBeTypeOf("number")
      expect(error.issues).not.toHaveLength(0)
      expect(error.cause).toBeInstanceOf(z.ZodError)
    }
  })

  it("prefixes collection validation paths with the item index", () => {
    const Schema = z.object({ email: z.email() })

    try {
      fixture.many(
        Schema,
        3,
        { email: ({ index }) => (index === 1 ? "invalid" : "ok@example.test") },
        { seed: 42 },
      )
      expect.unreachable("fixture collection should fail validation")
    } catch (error) {
      if (!(error instanceof FixtureValidationError)) throw error
      expect(error.path).toEqual([1, "email"])
    }
  })

  it("wraps provider failures with operation context", () => {
    const cause = new Error("provider unavailable")
    const throwingProvider: PrimitiveProvider = {
      email: () => {
        throw cause
      },
      string: () => {
        throw cause
      },
      url: () => {
        throw cause
      },
      uuid: () => {
        throw cause
      },
    }

    try {
      fixture(z.string(), undefined, { provider: throwingProvider, seed: 42 })
      expect.unreachable("provider should fail")
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error
      expect(error).toMatchObject({
        cause,
        code: "PROVIDER_ERROR",
        operation: "string",
        path: [0],
      })
      expect(error.seed).toBeTypeOf("number")
    }
  })

  it("accepts a deterministic custom primitive provider", () => {
    const provider: PrimitiveProvider = {
      email: ({ random }) => `user-${random.uint32() % 1_000}@example.test`,
      string: ({ random }) => `value-${random.uint32() % 1_000}`,
      url: ({ random }) => `https://example.test/${random.uint32() % 1_000}`,
      uuid: ({ random }) => {
        const value = random.uint32().toString(16).padStart(8, "0")
        return `${value}-0000-4000-8000-000000000000`
      },
    }
    const Schema = z.object({
      email: z.email(),
      id: z.uuid(),
      name: z.string(),
      url: z.url(),
    })

    const first = fixture(Schema, undefined, { provider, seed: 42 })
    const second = fixture(Schema, undefined, { provider, seed: 42 })

    expect(first).toEqual(second)
    expect(Schema.safeParse(first).success).toBe(true)
  })

  it.each([
    z.string().trim(),
    z.string().refine((value) => value === "allowed"),
    z.boolean().refine(Boolean),
    z.date().refine((value) => value.getUTCFullYear() === 2020),
    z.object({ value: z.string() }).refine(({ value }) => value === "allowed"),
  ])("rejects opaque checks instead of retrying", (Schema) => {
    expect(() => fixture(Schema, undefined, { seed: 42 })).toThrowError(
      expect.objectContaining({
        code: "UNSUPPORTED_SCHEMA",
      }) as UnsupportedSchemaError,
    )
  })

  it("locks representative seeded output for this package version", () => {
    const Schema = z.object({
      active: z.boolean(),
      email: z.email(),
      id: z.uuid(),
      name: z.string().min(6).max(10),
      scores: z.array(z.number().int().min(0).max(10)).length(2),
    })

    expect(fixture(Schema, undefined, { seed: "golden-v0.1" }))
      .toMatchInlineSnapshot(`
      {
        "active": false,
        "email": "Carolyn36@yahoo.com",
        "id": "0f6fb527-5136-48ef-b42b-f7a15d37f1d5",
        "name": "rarelyra",
        "scores": [
          5,
          10,
        ],
      }
    `)
  })
})
