import { defineFixture, defineFixtureSet } from "@fixturesmith/zod"
import { z } from "zod"

const Customer = z.object({
  id: z.uuid(),
  email: z.email(),
  plan: z.enum(["free", "pro"]),
})

const Order = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
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

const commerce = defineFixtureSet({
  fixtures: { customer, order },
  scenarios: {
    overdueCustomer: ({ create }) => {
      const account = create("customer", { variant: "pro" })
      const orders = create.many("order", 2, {
        overrides: { customerId: account.id },
      })
      return { account, orders }
    },
  },
})

const state = commerce.createScenario("overdueCustomer", { seed: 42 })

console.log("account:", state.account)
console.log("orders:", state.orders)
console.log(
  "orders belong to the account:",
  state.orders.every((item) => item.customerId === state.account.id),
)

const replayed = commerce.createScenario("overdueCustomer", { seed: 42 })
console.log(
  "the whole state replays from its seed:",
  JSON.stringify(replayed) === JSON.stringify(state),
)

const support = commerce.createScenario("overdueCustomer", {
  seed: 42,
  overrides: { customer: { email: "owner@example.test" } },
})
console.log("a test overrides only what it cares about:", support.account.email)
