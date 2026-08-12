# Scenarios and application states

A single fixture answers "give me any valid customer". A **scenario** answers
"give me a customer whose trial expired and whose last two orders are unpaid".
Scenarios turn several fixture definitions into one coherent
**application state**.

## Fixture sets

A **fixture set** is an immutable composition of fixture definitions and the
scenarios that use them:

```ts
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
    customerWithOrders: ({ create }) => {
      const account = create("customer", { variant: "pro" })
      const orders = create.many("order", 3, {
        overrides: { customerId: account.id },
      })
      return { account, orders }
    },
  },
})
```

Creating the state returns exactly what the recipe returned, fully typed:

```ts
const state = commerce.createScenario("customerWithOrders", { seed: 42 })

state.account.plan // "pro"
state.orders.length // 3
state.orders[0].customerId === state.account.id // true
```

Grouping definitions into a set never takes them away from you. The set exposes
its definitions, and each one remains independently usable:

```ts
commerce.fixtures.customer.create({ seed: 42 })
```

## One generation session

Every fixture created inside one `createScenario` call shares a single
generation session: one root seed, one `now` instant, one primitive provider,
and one optional/nullable policy pair.

```ts
commerce.createScenario("customerWithOrders", {
  now: new Date("2026-01-01T00:00:00.000Z"),
  nullables: "null",
  optionals: "omit",
  provider: myProvider,
  seed: "expired-trial",
})
```

Because the session owns these, individual `create()` calls inside a recipe
cannot take their own `seed`, `now`, or `provider` — that would break the
coherence and replay of the state.

Each `create()` and `create.many()` call derives its own seed from the session
root seed, the scenario name, and the call's position in the recipe. So two
`create("customer")` calls produce two different customers, the same seed
replays the entire state exactly, and a different seed changes all of it:

```ts
const first = commerce.createScenario("customerWithOrders", { seed: 42 })
const again = commerce.createScenario("customerWithOrders", { seed: 42 })
// deep equal
```

Because the derived seed includes the call's position, a recipe must not branch
on ambient state such as `Math.random()` or the wall clock. Use the session
`now` and `seed` exposed on the context instead:

```ts
scenarios: {
  stamped: ({ create, now, seed }) => ({
    account: create("customer"),
    generatedAt: now,
    reproduceWith: seed,
  })
}
```

## Overriding a scenario per test

A scenario should stay reusable rather than rigid. `createScenario` accepts
overrides keyed by fixture name, applied to every fixture of that name the
recipe creates:

```ts
const state = commerce.createScenario("customerWithOrders", {
  seed: 42,
  overrides: {
    customer: { email: "owner@example.test" },
    order: { total: 500 },
  },
})

state.account.email // "owner@example.test"
state.orders.every((item) => item.total === 500) // true
```

Precedence runs from the most reusable declaration to the most specific call
site:

1. Definition defaults
2. Selected variant
3. Recipe overrides passed to `create()`
4. Scenario overrides passed to `createScenario()`

Nested object overrides merge recursively across all four layers; arrays, dates,
and other atomic values replace.

Scenario overrides win over the recipe for the same reason derivation output
cannot replace an explicitly overridden field: an override a caller wrote by
name is honored rather than quietly discarded. The alternative would turn
`overrides: { order: { customerId: x } }` into a silent no-op, which is a worse
failure than an unwise but visible one.

The cost is that a scenario override can detach the orders from their account.
Nothing stops it, because a hand-wired `customerId` is an ordinary override that
the engine cannot tell apart from a domain value. Override the fields your test
is about and leave the fields that hold the state together alone. Declared
relations, which would let the engine recognise and protect foreign keys, remain
deferred.

Variant selection stays with the recipe. A scenario decides that its customer is
`pro`; a test that needs a free customer wants a different scenario, not a
different variant.

## Composing scenarios

A recipe is an ordinary function of its context, so a larger application state
is built by calling a smaller recipe with the same context. Declare the reusable
part with `ScenarioRecipe` and reuse it:

```ts
import type { ScenarioRecipe } from "@fixturesmith/zod"

const fixtures = { customer, order }

const proAccount: ScenarioRecipe<
  typeof fixtures,
  { account: z.output<typeof Customer> }
> = ({ create }) => ({ account: create("customer", { variant: "pro" }) })

const commerce = defineFixtureSet({
  fixtures,
  scenarios: {
    proAccount,
    proAccountWithPaidOrder: (context) => {
      const { account } = proAccount(context)
      return {
        account,
        order: context.create("order", {
          variant: "paid",
          overrides: { customerId: account.id },
        }),
      }
    },
  },
})
```

The composed recipe shares the caller's session, so the whole state still
replays from one seed and still uses one `now`.

## Validation and errors

Each fixture is parsed by its own source schema as it is created, so an invalid
override throws `FixtureValidationError` from the failing `create()` call with
its path and seed. A scenario is not a way to bypass schema validity.

Unknown scenario and fixture names are compile errors. They also throw
`InvalidFixtureOptionsError` at runtime for callers that reach the API from
untyped code.

## What scenarios are not

Scenarios describe application states. They do not yet declare relations between
fixture types — the recipe wires `customerId` itself. Automatic relation
generation (`belongsTo`, `hasMany`, dependency ordering, and cycle detection) is
tracked for a later release in the
[schema support matrix](../schema-support.md) and the project roadmap.
