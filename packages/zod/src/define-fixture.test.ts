import {
  FixtureValidationError,
  InvalidFixtureOptionsError,
} from "@fixturesmith/core"
import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"

import { defineFixture } from "./define-fixture.js"

describe("defineFixture", () => {
  const Account = z.object({
    email: z.email(),
    id: z.uuid(),
    profile: z.object({
      displayName: z.string(),
      slug: z.string(),
    }),
    role: z.enum(["admin", "member"]),
  })

  it("creates schema outputs from reusable static and callback defaults", () => {
    const account = defineFixture(Account, {
      defaults: {
        email: ({ index }) => `member-${index}@example.test`,
        profile: { displayName: "Ada" },
        role: "member",
      },
    })

    const value = account.create({ seed: 42 })

    expectTypeOf(value).toEqualTypeOf<z.output<typeof Account>>()
    expect(value).toMatchObject({
      email: "member-0@example.test",
      profile: { displayName: "Ada" },
      role: "member",
    })
    expect(Account.safeParse(value).success).toBe(true)
  })

  it("selects one variant and gives per-call overrides highest precedence", () => {
    const account = defineFixture(Account, {
      defaults: { role: "member" },
      variants: {
        admin: {
          email: "admin@example.test",
          role: "admin",
        },
      },
    })

    expect(account.create({ seed: 42 }).role).toBe("member")
    expect(account.create({ seed: 42, variant: "admin" })).toMatchObject({
      email: "admin@example.test",
      role: "admin",
    })
    expect(
      account.create({
        overrides: { email: "owner@example.test" },
        seed: 42,
        variant: "admin",
      }),
    ).toMatchObject({ email: "owner@example.test", role: "admin" })
  })

  it("derives fields from the complete provisional fixture", () => {
    const Booking = z.object({
      endsAt: z.date(),
      label: z.string(),
      startsAt: z.date(),
    })
    const startsAt = new Date("2026-08-12T10:00:00.000Z")
    const booking = defineFixture(Booking, {
      defaults: { startsAt },
      derive: ({ index, now, value }) => ({
        endsAt: new Date(value.startsAt.getTime() + 2 * 60 * 60 * 1_000),
        label: `${index}-${now.toISOString()}`,
      }),
    })

    const value = booking.create({
      now: new Date("2026-08-12T12:00:00.000Z"),
      seed: 42,
    })

    expect(value).toEqual({
      endsAt: new Date("2026-08-12T12:00:00.000Z"),
      label: "0-2026-08-12T12:00:00.000Z",
      startsAt,
    })
  })

  it("lets derivation see source overrides without replacing target overrides", () => {
    const Booking = z.object({ endsAt: z.date(), startsAt: z.date() })
    const booking = defineFixture(Booking, {
      derive: ({ value }) => ({
        endsAt: new Date(value.startsAt.getTime() + 60 * 60 * 1_000),
      }),
    })
    const startsAt = new Date("2026-08-12T10:00:00.000Z")
    const explicitEnd = new Date("2026-08-12T15:00:00.000Z")

    expect(
      booking.create({
        overrides: { endsAt: explicitEnd, startsAt },
        seed: 42,
      }),
    ).toEqual({ endsAt: explicitEnd, startsAt })

    expect(
      booking.create({ overrides: { startsAt }, seed: 42 }).endsAt,
    ).toEqual(new Date("2026-08-12T11:00:00.000Z"))
  })

  it("preserves explicitly overridden nested derivation targets", () => {
    const Person = z.object({
      profile: z.object({ displayName: z.string(), firstName: z.string() }),
    })
    const person = defineFixture(Person, {
      derive: ({ value }) => ({
        profile: {
          displayName: value.profile.firstName,
          firstName: value.profile.firstName,
        },
      }),
    })

    expect(
      person.create({
        overrides: {
          profile: { displayName: "Countess", firstName: "Ada" },
        },
        seed: 42,
      }),
    ).toEqual({ profile: { displayName: "Countess", firstName: "Ada" } })
  })

  it("derives every collection item with its index", () => {
    const Item = z.object({ label: z.string() })
    const item = defineFixture(Item, {
      derive: ({ index }) => ({ label: `item-${index}` }),
    })

    expect(item.many(3, { seed: 42 })).toEqual([
      { label: "item-0" },
      { label: "item-1" },
      { label: "item-2" },
    ])
  })

  it("snapshots its declaration and returns independent values", () => {
    const roles: Array<"admin" | "member"> = ["member"]
    const Schema = z.object({
      createdAt: z.date(),
      roles: z.array(z.enum(["admin", "member"])),
    })
    const createdAt = new Date("2026-08-12T12:00:00.000Z")
    const definition = defineFixture(Schema, {
      defaults: { createdAt, roles },
    })

    roles[0] = "admin"
    createdAt.setUTCFullYear(1999)
    const first = definition.create({ seed: 42 })
    first.roles[0] = "admin"
    first.createdAt.setUTCFullYear(1998)

    expect(definition.create({ seed: 42 })).toEqual({
      createdAt: new Date("2026-08-12T12:00:00.000Z"),
      roles: ["member"],
    })
    expect(Object.isFrozen(definition)).toBe(true)
  })

  it("replays definitions with the same seed", () => {
    const account = defineFixture(Account)

    expect(account.create({ seed: 42 })).toEqual(account.create({ seed: 42 }))
    expect(account.create({ seed: 42 })).toEqual(
      account.many(1, { seed: 42 })[0],
    )
  })

  it("preserves an explicit undefined root default", () => {
    const optionalText = defineFixture(z.string().optional(), {
      defaults: undefined,
    })

    expect(optionalText.create({ seed: 42 })).toBeUndefined()
  })

  it("shares optional and nullable policies with immediate generation", () => {
    const State = z.object({
      nullable: z.string().nullable(),
      optional: z.string().optional(),
    })
    const state = defineFixture(State)
    const value = state.create({
      nullables: "null",
      optionals: "omit",
      seed: 42,
    })

    expect(value).toEqual({ nullable: null })
    expect(Object.hasOwn(value, "optional")).toBe(false)
  })

  it("rejects unknown variants at runtime", () => {
    const account = defineFixture(Account, {
      variants: { admin: { role: "admin" } },
    })

    expect(() => account.create({ variant: "missing" as never })).toThrowError(
      InvalidFixtureOptionsError,
    )
  })

  it("validates the final derived fixture", () => {
    const Email = z.object({ email: z.email() })
    const email = defineFixture(Email, {
      derive: () => ({ email: "invalid" }),
    })

    expect(() => email.create({ seed: 42 })).toThrowError(
      FixtureValidationError,
    )
  })
})
