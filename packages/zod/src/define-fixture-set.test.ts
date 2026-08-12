import {
  InvalidFixtureOptionsError,
  type PrimitiveProvider,
} from "@fixturesmith/core"
import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"

import { defineFixture } from "./define-fixture.js"
import { defineFixtureSet, type ScenarioRecipe } from "./define-fixture-set.js"

const Customer = z.object({
  email: z.email(),
  id: z.uuid(),
  plan: z.enum(["free", "pro"]),
})

const Order = z.object({
  customerId: z.uuid(),
  id: z.uuid(),
  status: z.enum(["paid", "pending"]),
  total: z.number().int().min(1).max(1_000),
})

const customer = defineFixture(Customer, {
  defaults: { plan: "free" },
  variants: { pro: { plan: "pro" } },
})

const order = defineFixture(Order, {
  defaults: { status: "pending" },
  variants: { paid: { status: "paid" } },
})

const fixtures = { customer, order }

const commerce = defineFixtureSet({
  fixtures,
  scenarios: {
    customerWithOrders: ({ create }) => {
      const account = create("customer", { variant: "pro" })
      const orders = create.many("order", 3, {
        overrides: { customerId: account.id },
      })
      return { account, orders }
    },
    emptyAccount: ({ create }) => ({ account: create("customer") }),
  },
})

describe("defineFixtureSet", () => {
  it("produces a coherent application state from one recipe", () => {
    const state = commerce.createScenario("customerWithOrders", { seed: 42 })

    expectTypeOf(state.account).toEqualTypeOf<z.output<typeof Customer>>()
    expectTypeOf(state.orders).toEqualTypeOf<Array<z.output<typeof Order>>>()

    expect(state.account.plan).toBe("pro")
    expect(state.orders).toHaveLength(3)
    for (const item of state.orders) {
      expect(item.customerId).toBe(state.account.id)
      expect(Order.safeParse(item).success).toBe(true)
    }
    expect(Customer.safeParse(state.account).success).toBe(true)
  })

  it("replays a whole scenario from its seed", () => {
    expect(commerce.createScenario("customerWithOrders", { seed: 42 })).toEqual(
      commerce.createScenario("customerWithOrders", { seed: 42 }),
    )
    expect(
      commerce.createScenario("customerWithOrders", { seed: 42 }).account.id,
    ).not.toBe(
      commerce.createScenario("customerWithOrders", { seed: 7 }).account.id,
    )
  })

  it("isolates each create call and each scenario", () => {
    const twoCustomers = defineFixtureSet({
      fixtures,
      scenarios: {
        pair: ({ create }) => [create("customer"), create("customer")],
        single: ({ create }) => [create("customer")],
      },
    })

    const [first, second] = twoCustomers.createScenario("pair", { seed: 42 })

    expect(first?.id).not.toBe(second?.id)
    expect(twoCustomers.createScenario("single", { seed: 42 })[0]?.id).not.toBe(
      first?.id,
    )
  })

  it("shares one session instant across every fixture in the scenario", () => {
    const Stamped = z.object({ createdAt: z.date() })
    const stamped = defineFixture(Stamped, {
      derive: ({ now }) => ({ createdAt: now }),
    })
    const now = new Date("2026-08-12T12:00:00.000Z")
    const set = defineFixtureSet({
      fixtures: { stamped },
      scenarios: {
        pair: ({ create, now: sessionNow }) => ({
          first: create("stamped"),
          second: create("stamped"),
          sessionNow,
        }),
      },
    })

    const state = set.createScenario("pair", { now, seed: 42 })

    expect(state.first.createdAt).toEqual(now)
    expect(state.second.createdAt).toEqual(now)
    expect(state.sessionNow).toEqual(now)
  })

  it("gives per-test scenario overrides precedence over the recipe", () => {
    const state = commerce.createScenario("customerWithOrders", {
      overrides: {
        customer: { email: "owner@example.test" },
        order: { total: 500 },
      },
      seed: 42,
    })

    expect(state.account.email).toBe("owner@example.test")
    expect(state.account.plan).toBe("pro")
    for (const item of state.orders) {
      expect(item.total).toBe(500)
      expect(item.customerId).toBe(state.account.id)
    }
  })

  it("merges scenario overrides into recipe overrides recursively", () => {
    const Profile = z.object({
      profile: z.object({ displayName: z.string(), locale: z.string() }),
    })
    const person = defineFixture(Profile)
    const set = defineFixtureSet({
      fixtures: { person },
      scenarios: {
        one: ({ create }) =>
          create("person", { overrides: { profile: { locale: "en-GB" } } }),
      },
    })

    expect(
      set.createScenario("one", {
        overrides: { person: { profile: { displayName: "Ada" } } },
        seed: 42,
      }),
    ).toEqual({ profile: { displayName: "Ada", locale: "en-GB" } })
  })

  it("composes a larger state from smaller recipes", () => {
    const accountOnly: ScenarioRecipe<
      typeof fixtures,
      { account: z.output<typeof Customer> }
    > = ({ create }) => ({ account: create("customer", { variant: "pro" }) })

    const set = defineFixtureSet({
      fixtures,
      scenarios: {
        accountOnly,
        accountWithPaidOrder: (context) => {
          const { account } = accountOnly(context)
          return {
            account,
            order: context.create("order", {
              overrides: { customerId: account.id },
              variant: "paid",
            }),
          }
        },
      },
    })

    const state = set.createScenario("accountWithPaidOrder", { seed: 42 })

    expect(state.account.plan).toBe("pro")
    expect(state.order.status).toBe("paid")
    expect(state.order.customerId).toBe(state.account.id)
  })

  it("routes every fixture in the scenario through one shared provider", () => {
    let calls = 0
    const provider: PrimitiveProvider = {
      email: () => "session@example.test",
      string: () => "session",
      url: () => "https://example.test",
      uuid: () => {
        calls += 1
        return `00000000-0000-4000-8000-${String(calls).padStart(12, "0")}`
      },
    }
    const Token = z.object({ id: z.uuid() })
    const token = defineFixture(Token)
    const set = defineFixtureSet({
      fixtures: { token },
      scenarios: {
        pair: ({ create }) => ({
          many: create.many("token", 2),
          single: create("token"),
        }),
      },
    })

    const state = set.createScenario("pair", { provider, seed: 42 })

    expect(calls).toBe(3)
    expect(state.many.map((item) => item.id)).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ])
    expect(state.single.id).toBe("00000000-0000-4000-8000-000000000003")
  })

  it("applies session optional and nullable policies to every fixture", () => {
    const State = z.object({
      nullable: z.string().nullable(),
      optional: z.string().optional(),
    })
    const state = defineFixture(State)
    const set = defineFixtureSet({
      fixtures: { state },
      scenarios: { pair: ({ create }) => create.many("state", 2) },
    })

    const values = set.createScenario("pair", {
      nullables: "null",
      optionals: "omit",
      seed: 42,
    })

    expect(values).toEqual([{ nullable: null }, { nullable: null }])
    expect(values.every((value) => !Object.hasOwn(value, "optional"))).toBe(
      true,
    )
  })

  it("keeps its fixture definitions independently usable", () => {
    expect(commerce.fixtures.customer).toBe(customer)
    expect(Customer.safeParse(customer.create({ seed: 42 })).success).toBe(true)
    expect(Object.isFrozen(commerce)).toBe(true)
    expect(Object.isFrozen(commerce.fixtures)).toBe(true)
  })

  it("rejects unknown scenario and fixture names at runtime", () => {
    expect(() => commerce.createScenario("missing" as never)).toThrowError(
      InvalidFixtureOptionsError,
    )

    const broken = defineFixtureSet({
      fixtures,
      scenarios: { bad: ({ create }) => create("missing" as never) },
    })
    expect(() => broken.createScenario("bad", { seed: 42 })).toThrowError(
      InvalidFixtureOptionsError,
    )
  })

  it("rejects an invalid session instant before generating", () => {
    expect(() =>
      commerce.createScenario("emptyAccount", {
        now: new Date("nonsense"),
        seed: 42,
      }),
    ).toThrowError(InvalidFixtureOptionsError)
  })
})
