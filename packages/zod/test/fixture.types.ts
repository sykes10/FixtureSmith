import { z } from "zod"

import { defineFixture, defineFixtureSet, fixture } from "../src/index.js"

declare function expectType<T>(value: T): void

const User = z.object({
  email: z.email(),
  profile: z.object({
    displayName: z.string(),
    website: z.url().nullable(),
  }),
  roles: z.array(z.enum(["admin", "member"])),
})

const user = fixture(User, {
  overrides: {
    email: ({ index, provider }) =>
      `user-${index}-${provider.uuid()}@example.test`,
    profile: {
      displayName: "Ada",
    },
    roles: ["admin"],
  },
})

expectType<z.output<typeof User>>(user)
expectType<Array<z.output<typeof User>>>(fixture.many(User, 3))

fixture.many(User, 3, {
  overrides: { email: ({ index }) => `user-${index}@example.test` },
})

fixture(User, {
  overrides: { profile: { website: null } },
})

// @ts-expect-error overrides must be nested under the named options property
fixture(User, { email: "member@example.test" })

// @ts-expect-error the legacy positional override and options API is rejected
fixture(User, { overrides: { email: "member@example.test" } }, { seed: 42 })

// @ts-expect-error unknown override fields are rejected
fixture(User, { overrides: { unknown: "value" } })

// @ts-expect-error static override values must match schema output
fixture(User, { overrides: { email: 42 } })

// @ts-expect-error callback results must match the field output
fixture(User, { overrides: { email: () => 42 } })

// @ts-expect-error array members must match the schema output
fixture(User, { overrides: { roles: ["owner"] } })

// @ts-expect-error collection overrides retain field types
fixture.many(User, 3, { overrides: { email: 42 } })

fixture(User, {
  now: new Date(),
  nullables: "null",
  optionals: "omit",
})

const userDefinition = defineFixture(User, {
  defaults: {
    email: ({ now, provider }) =>
      `${now.getUTCFullYear()}-${provider.uuid()}@example.test`,
  },
  variants: {
    admin: { roles: ["admin"] },
    member: { roles: ["member"] },
  },
  derive: ({ index, now, value }) => ({
    email: `${index}-${now.getUTCFullYear()}-${value.email}`,
  }),
})

expectType<z.output<typeof User>>(userDefinition.create())
expectType<Array<z.output<typeof User>>>(userDefinition.many(3))
userDefinition.create({ variant: "admin" })
userDefinition.many(3, { variant: "member" })

// @ts-expect-error a definition accepts only one known variant
userDefinition.create({ variant: "unknown" })

const plainUserDefinition = defineFixture(User)
// @ts-expect-error definitions without variants cannot select one
plainUserDefinition.create({ variant: "admin" })

const defaultedUserDefinition = defineFixture(User, {
  defaults: { roles: ["member"] },
})
// @ts-expect-error definitions with no declared variants cannot select one
defaultedUserDefinition.create({ variant: "admin" })

defineFixture(User, {
  // @ts-expect-error defaults reject unknown output fields
  defaults: { unknown: true },
})

// @ts-expect-error variants retain output field types
defineFixture(User, {
  variants: {
    invalid: {
      roles: ["owner"],
    },
  },
})

// @ts-expect-error variants cannot define their own derivation
defineFixture(User, { variants: { invalid: { derive: () => ({}) } } })

defineFixture(User, {
  // @ts-expect-error derivation has no provider or random context
  derive: ({ provider }) => ({ email: provider.email() }),
})

defineFixture(User, {
  // @ts-expect-error derivation results retain output field types
  derive: () => ({ roles: ["owner"] }),
})

defineFixture(User, {
  derive: ({ value }) => {
    // @ts-expect-error derivation receives readonly arrays
    value.roles.push("admin")
    return {}
  },
})

const Order = z.object({
  id: z.uuid(),
  ownerEmail: z.email(),
  total: z.number(),
})

const orderDefinition = defineFixture(Order, {
  variants: { paid: { total: 10 } },
})

const commerce = defineFixtureSet({
  fixtures: { order: orderDefinition, user: userDefinition },
  scenarios: {
    userWithOrders: ({ create }) => {
      const owner = create("user", { variant: "admin" })
      return {
        orders: create.many("order", 2, {
          overrides: { ownerEmail: owner.email },
        }),
        owner,
      }
    },
  },
})

const state = commerce.createScenario("userWithOrders", { seed: 42 })
expectType<z.output<typeof User>>(state.owner)
expectType<Array<z.output<typeof Order>>>(state.orders)
expectType<z.output<typeof User>>(commerce.fixtures.user.create())

commerce.createScenario("userWithOrders", {
  now: new Date(),
  nullables: "null",
  optionals: "omit",
  overrides: { order: { total: 5 }, user: { email: "owner@example.test" } },
})

// @ts-expect-error only declared scenarios can be created
commerce.createScenario("unknownScenario")

commerce.createScenario("userWithOrders", {
  // @ts-expect-error scenario overrides are keyed by fixture name
  overrides: { unknownFixture: { total: 5 } },
})

commerce.createScenario("userWithOrders", {
  // @ts-expect-error scenario overrides retain each fixture output type
  overrides: { order: { total: "free" } },
})

defineFixtureSet({
  fixtures: { order: orderDefinition },
  scenarios: {
    // @ts-expect-error only declared fixtures can be created
    unknownFixture: ({ create }) => create("user"),
  },
})

defineFixtureSet({
  fixtures: { order: orderDefinition },
  scenarios: {
    // @ts-expect-error a scenario fixture accepts only its own variants
    unknownVariant: ({ create }) => create("order", { variant: "refunded" }),
  },
})

defineFixtureSet({
  fixtures: { order: orderDefinition },
  scenarios: {
    // @ts-expect-error recipe overrides retain the fixture output type
    badOverride: ({ create }) => create("order", { overrides: { total: "" } }),
  },
})

defineFixtureSet({
  fixtures: { order: orderDefinition },
  scenarios: {
    // @ts-expect-error a scenario has no per-call seed or provider
    seeded: ({ create }) => create("order", { seed: 42 }),
  },
})
