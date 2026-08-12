**OPEN SOURCE PRODUCT**

# FixtureSmith

**Modern Test-Data / Fixture Engine**

**Product Requirements Document (PRD)**

> **Product thesis  Faker generates fake values. This project generates reproducible application states.**

| Status | Concept → MVP definition |
| --- | --- |
| Primary surface | TypeScript library / OSS packages |
| Target users | Frontend, full-stack and test engineers |
| Working name | FixtureSmith |

> **Decision:** Decision we are making: build a schema-first fixture engine, not a replacement catalog of faker.person(), faker.company(), etc.

## 1. Executive summary

The project is an open-source TypeScript fixture engine that turns existing schemas into deterministic, coherent test data and application states. It uses value generators such as Faker as providers rather than attempting to replace their enormous catalogue of names, addresses, phone numbers and other primitives.

The differentiator is the layer above individual fake values: schema understanding, overrides, relationships, scenarios, edge cases and adapters for the tools developers already use in tests, component development and local environments.

> **North-star experience  A developer should be able to point the library at a schema, generate valid data in one line, then progressively add domain meaning only where it matters.**

## 2. Problem

Modern TypeScript applications often define the same domain shape multiple times: validation schemas, API contracts, MSW handlers, Storybook mocks, Playwright fixtures, database seeds and hand-written test factories. The data drifts, relationships break, tests become verbose and edge cases are inconsistently represented.

- Developers repeatedly hand-write objects that already exist as Zod/JSON/OpenAPI schemas.

- Faker is excellent at primitive realism but does not understand application state or business relationships.

- Random data can make tests flaky when it is not deterministic or easy to reproduce.

- Fixtures tend to over-specify irrelevant fields, making tests noisy and brittle.

- Frontend mock data, Storybook stories and E2E seed data frequently diverge from each other.

- Generating a valid object is easier than generating a meaningful state such as “trial expired”, “customer with three orders” or “failed payment”.

## 3. Product goals

- Generate valid typed objects directly from supported schemas.

- Make generated output deterministic and reproducible by default when a seed is supplied.

- Allow developers to override only the fields relevant to a test.

- Represent domain relationships and produce coherent object graphs.

- Promote scenarios/application states to a first-class concept.

- Reuse the same data definitions across unit tests, MSW, Storybook, Playwright and optional database seeding.

- Keep the core local, fast and AI-independent.

- Expose a small, composable API that feels native in TypeScript.

## 4. Non-goals

- Reimplement the full Faker primitive catalogue. Faker or another provider should fill that role.

- Become a test runner, request interceptor, ORM or schema validator.

- Support every schema library in v0.1.

- Generate production data or anonymise real production datasets.

- Return deliberately invalid values or automatic boundary-case suites from
  fixture APIs. A separate validation-case API may be considered if demand
  emerges.

- Require an LLM or network request to create fixtures.

- Build a GUI before the library API proves useful.

- Guarantee semantic realism from schema information alone. Domain hints must remain explicit and overridable.

## 5. Target users and jobs-to-be-done

| Persona | Job to be done |
| --- | --- |
| Frontend engineer | “I have Zod/API schemas. Give me valid mock data for components and MSW without manually maintaining giant objects.” |
| Test engineer | “Give me reproducible fixtures and edge cases that make failures easy to replay.” |
| Full-stack engineer | “Generate coherent users/orders/products that can be reused in tests or seeded into a local database.” |
| Library / design-system author | “Produce representative props and states for stories with minimal fixture code.” |

## 6. Product principles

Schema-first, not factory-first: Start from the source of truth the application already owns. Factories extend schemas rather than duplicate them.

Useful defaults, explicit meaning: Generate structurally valid values automatically; let developers explicitly describe business semantics.

Determinism is a feature: A seed should reproduce the same complete graph, including relations and scenarios.

Progressive complexity: One-line generation should work; relations, providers and adapters should layer on only when needed.

One domain model, many surfaces: The same fixture/scenario definition should power tests, mocks, stories and development data.

Adapters over integrations in core: Keep the core independent and publish thin integrations for MSW, Playwright, Storybook, ORMs, etc.

## 7. Product model

```text
Schema / contract
      ↓
Fixture definition ── defaults / variants / overrides
      ↓
Fixture engine ───── deterministic PRNG
      ↓
Object / graph / scenario
      ↓
Adapters
  ├─ Vitest / Jest
  ├─ MSW
  ├─ Storybook
  ├─ Playwright
  └─ DB seed (later)
```

Fixture definitions are independently usable. The application-level layer is an
optional immutable composition of existing definitions, introduced only for
cross-fixture scenarios and relations; registration does not change standalone
fixture behavior.

## 8. Proposed public API

### 8.1 Zero-config generation

```ts
import { fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(100),
})

const user = fixture(User)
const users = fixture.many(User, 20)
```

### 8.2 Overrides

```ts
const admin = fixture(User, {
  overrides: {
    role: "admin",
  },
})

const users = fixture.many(User, 10, {
  overrides: {
    role: "member",
  },
})
```

### 8.3 Reproducible generation

```ts
const user = fixture(User, { seed: 1234 })

// same schema + same seed => same generated result
```

### 8.4 Named fixture definitions

```ts
const user = defineFixture(User, {
  defaults: {
    role: "member",
    email: ({ provider }) => provider.email(),
  },
  variants: {
    admin: { role: "admin" },
  },
})

user.create()
user.create({ variant: "admin" })
user.create({ overrides: { role: "admin" }, seed: 42 })
user.many(10, { variant: "admin", seed: 42 })
```

`create()` and variant creation always return the fixture definition's schema
output. Custom result shapes belong to later multi-fixture scenarios, not to a
standalone fixture definition. Each unseeded standalone `create()` call starts a
fresh generation session; repeated calls replay only when given the same seed.

### 8.5 Scenarios

```ts
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

commerce.createScenario("customerWithOrders", { seed: 42 })
```

### 8.6 Relations (post-MVP)

```ts
const commerce = defineFixtureSet({
  fixtures: { user, order },
  relations: {
    order: {
      userId: belongsTo("user"),
    },
  },
})

const data = commerce.generate({
  user: 20,
  order: 100,
})
```

## 9. Feature inventory

Priorities: P0 = required for a credible first release; P1 = immediately valuable follow-up; P2 = adoption/expansion; Later = deliberately deferred.

### 9.1 Core engine — v0.1 MVP

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| Schema → object generation | P0 | Generate an object matching a supported schema. | Generated output passes schema validation. |
| Primitive generators | P0 | Strings, numbers, booleans, dates, enums/literals, arrays, nullable/optional values. | Common schema primitives work without custom configuration. |
| Constraint-aware values | P0 | Respect min/max, length, regex where feasible, UUID/email/URL formats and enum domains. | Generated values satisfy supported constraints. |
| Type inference | P0 | Return the schema’s inferred TypeScript type. | No cast required at call site. |
| Nested schemas | P0 | Objects and nested arrays/objects generate recursively. | Deep output validates. |
| many(n) | P0 | Generate arrays of N fixtures. | Stable typed array API. |
| Overrides | P0 | Explicit values and field generator callbacks override generated defaults. | Developer can specify only relevant fields. |
| Seeded PRNG | P0 | Seed controls the entire generation path. | Same seed + same config reproduces result. |
| Provider abstraction | P0 | Primitive realism can come from Faker behind a provider interface. | Core is not permanently coupled to one provider. |
| Useful errors | P0 | Unsupported schema nodes fail with actionable path/context. | Errors identify schema path and unsupported feature. |

> **MVP rule  v0.1 is successful when a TypeScript developer can replace a hand-written test object with fixture(schema) and still retain predictable overrides and reproducibility.**

### 9.2 Domain fixtures — v0.2

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| defineFixture() | P1 | Reusable fixture definition bound to a schema. | Factories stop duplicating schema structure. |
| Defaults | P1 | Static values and callbacks layered on top of schema generation. | A project can define “normal user” once. |
| Variants | P1 | Flat, named single-fixture configurations using the same static values and callbacks as defaults; creation selects at most one. | Reusable fixture intent is statically discoverable without merge precedence. |
| Derivation | P1 | One atomic callback calculates typed fields from a complete provisional fixture. | Cross-field invariants avoid property-order and partial-object semantics. |
| Time context | P1 | Every callback in a generation session receives the same deterministic `now`. | Time-relative fixtures remain coherent and reproducible. |
| Optional policy | P1 | Choose `present` or `omit` across a generation session. | Optional API shapes are explicit and reproducible. |
| Nullable policy | P1 | Choose `value` or `null` across a generation session. | Nullable API states are explicit and reproducible. |

### 9.3 Scenarios / application states — v0.3

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| Named scenarios | P1 | Define domain states such as failed-payment or empty-account. | Tests can request intent by name. |
| Scenario overrides | P1 | Scenario can be further overridden per test. | Scenario remains reusable rather than rigid. |
| Scenario composition | P2 | Build a larger application state from smaller scenario recipes. | Avoid duplicating multi-fixture setup. |
| Scenario metadata | P2 | Description/tags for tooling and docs. | Adapters can surface human-readable state info. |

### 9.4 Relations / graph generation — v0.4

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| belongsTo | P1 | Foreign-key relationship to another fixture type. | Generated FK references an existing generated parent. |
| hasMany | P1 | Generate child collections linked to a parent. | Object graph remains internally coherent. |
| hasOne | P2 | Single linked child entity. | One-to-one state supported. |
| Cardinality controls | P1 | Exact/range counts for relations. | e.g. customer with 0–5 orders. |
| Dependency graph ordering | P1 | Resolve generation order automatically. | Parents generated before dependent children. |
| Cycle detection | P1 | Detect impossible/cyclic fixture dependencies. | Failure is explicit and actionable. |
| Reference strategy | P2 | Use IDs, embedded objects or custom selectors. | Works across API and DB-shaped domains. |

### 9.5 Edge-state generation — later

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| Unicode / unusual strings | P2 | Generate long names, emoji, RTL/diacritics and whitespace cases. | UI robustness cases become reusable. |
| Collection extremes | P2 | Empty, one, many and capped arrays. | List states are trivial to produce. |

### 9.6 Integrations / adapters

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| MSW adapter | P1 | Create response factories/handlers from fixtures and scenarios. | Same domain fixture drives API mocks. |
| Storybook recipe | P1 | Document direct use of fixtures and scenarios in args and loaders. | Stories reuse application states without an integration package. |
| Playwright adapter | P2 | Deterministic data setup / API responses per test. | E2E failure can be reproduced from seed + scenario. |
| Vitest/Jest helpers | P2 | Ergonomic per-test fixture setup and seed reporting. | Test failure logs include reproduction data. |
| OpenAPI input | P2 | Generate response/request data from OpenAPI/JSON Schema. | Teams without Zod can adopt. |
| Prisma/Drizzle seed adapter | Later | Materialise relational fixture graphs into a local/test DB. | Graph can be persisted without core ORM coupling. |

### 9.7 Extensibility

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| Custom provider interface | P0 | Swap or augment Faker with custom generators. | Core can evolve independently from Faker. |
| Plugin package model | P2 | Adapters and schema libraries live in separate packages. | Core bundle and dependency graph stay small. |

### 9.8 Developer experience

| Feature | Priority | What it does | Acceptance signal |
| --- | --- | --- | --- |
| Excellent TypeScript autocomplete | P0 | Overrides, scenario names and fixture outputs are statically typed. | Invalid field names/values fail at compile time. |
| Tree-shakeable ESM | P0 | Modern package output with explicit exports. | Works cleanly in Node and modern build tools. |
| Seed shown on failure | P1 | Helpers make reproduction seed easy to log/copy. | Randomised test can be replayed. |
| Debug trace | P2 | Explain how a field was generated and which rule/provider won. | Complex fixture behaviour is inspectable. |
| Docs playground | Later | Interactive examples for schema → fixture output. | Adoption/docs improvement after API stabilises. |

## 10. Schema support strategy

Do not begin with universal schema support. Build one excellent adapter, then generalise the internal intermediate representation only when a second adapter proves the abstraction.

- v0.1: Zod as the reference implementation because it is TypeScript-native and allows a strong initial DX.

- Core architecture: normalise supported schema nodes into an internal generation plan rather than scattering Zod-specific logic through the engine.

- After reusable fixture definitions and scenarios are proven, evaluate Standard
  Schema support or a second adapter such as Valibot to validate the
  abstraction.

- Broader Zod compatibility is demand-driven rather than a gate for reusable
  fixture definitions. The current documented subset may ship while unsupported
  constructs continue to fail explicitly.

- Later: JSON Schema/OpenAPI adapter for API-centric teams.

## 11. Generation semantics

### 11.1 Precedence

When several possible generation rules exist, resolve them in a predictable order:

1. Explicit per-call override

1. Derivation output

1. Selected variant

1. Fixture default

1. Schema constraint-aware default

1. Provider primitive fallback

Derivation evaluates after defaults, the selected variant and per-call overrides
have formed a complete provisional fixture. It therefore sees overridden source
fields, but its output cannot replace a field explicitly overridden by the call.
A variant cannot define a separate derivation; the fixture definition's single
derivation runs after the selected variant.

Derivation is a pure calculation over the readonly provisional fixture, session
`now`, and collection index. It does not receive a provider or random source;
random and semantic value generation belongs in defaults or variants.

### 11.2 Randomness

- The engine owns the PRNG context; providers consume it rather than creating unrelated random streams.

- Nested generation and relation generation must derive deterministic sub-seeds or consume randomness in a documented stable order.

- A failure/debug mode should make the root seed visible.

### 11.3 Optional values

Optional and nullable fields use separate generation-session policies. Defaults
are `optionals: "present"` and `nullables: "value"`; callers can select
`optionals: "omit"` and `nullables: "null"`. Variants and overrides target
individual fields when a session-wide policy is too broad.

### 11.4 Time

One immutable `now` value belongs to the generation session and is shared by
fixture defaults, variants, derivation, and scenario orchestration. Generation
must never read the wall clock independently inside callbacks. When the caller
does not supply `now`, the session uses the exported, version-stable default
`2000-01-01T00:00:00.000Z`.

Seed, `now`, and primitive-provider selection belong to the generation session,
not to fixture definitions. Definitions remain portable across test and adapter
environments.

Immediate `fixture()` calls and reusable fixture-definition creation share the
same session options: `seed`, `now`, `provider`, `optionals`, `nullables`, and
`overrides`. Reusable definitions add only the optional `variant` selection.

## 12. Proposed package architecture

```text
packages/
  core/              # PRNG, generation plan, fixture definitions, scenarios
  zod/               # Zod adapter
  provider-faker/    # Faker-backed primitive provider
  msw/               # MSW integration
  playwright/        # E2E helpers (later)
  json-schema/       # JSON Schema/OpenAPI adapter (later)
```

- Keep @fixturesmith/core free from Zod, Faker, MSW and Storybook peer dependencies.

- Schema adapters translate into a shared internal representation.

- `@fixturesmith/zod` publicly owns both `fixture()` and the typed
  `defineFixture()` facade. Core owns their schema-neutral generation-session
  mechanics.

- Provider packages resolve semantic values; integration packages consume fixtures rather than owning generation logic.

## 13. MVP scope: what we actually build first

> **Recommended first release  Ship one narrow, polished path: Zod → valid deterministic typed fixture, with overrides, arrays and Faker-backed semantic primitives.**

| # | Deliverable | Scope |
| --- | --- | --- |
| 1 | Core PRNG context | Seed, deterministic random helpers and context propagation. |
| 2 | Zod adapter | Object, string, number, boolean, date, enum/literal, arrays, optional/nullable and nested nodes. |
| 3 | Constraint handling | Min/max, length, UUID, email, URL and simple schema constraints. |
| 4 | Provider abstraction | Provider interface + Faker provider. |
| 5 | fixture(schema) | Generate one typed fixture. |
| 6 | many(n) | Generate N fixtures. |
| 7 | Overrides | Static values and typed callbacks. |
| 8 | Error model | Unsupported node errors with path and remediation. |
| 9 | Docs + examples | README, API reference, recipes and comparison with Faker/manual factories. |
| 10 | Test matrix | Determinism, validation, nested schemas, constraints and override precedence. |

### 13.1 Explicitly excluded from v0.1

- Relations/graph generation

- Named scenarios

- MSW/Storybook adapters

- OpenAPI/JSON Schema input

- Database seeding

- Invalid data generation through fixture APIs

- CLI

- AI generation

- GUI/playground

## 14. Release roadmap

| Release | Contents | Purpose |
| --- | --- | --- |
| v0.1 — Valid fixtures | Schema generation, constraints, seed, overrides, arrays, provider abstraction. | Prove core DX. |
| v0.2 — Domain fixtures | `defineFixture`, defaults, variants, derivation, deterministic time, and optional/nullable policies. | Replace hand-written factories. |
| v0.3 — Scenarios | Fixture sets, named states, and scenario composition. | Move from individual fixtures to application states. |
| v0.4 — MSW integration | Thin response and handler helpers powered by fixture sets and scenarios. | Prove one application state works across tests and API mocks. |
| v0.5 — Relations | belongsTo/hasMany, graph generation, cardinality, cycle handling. | Generate coherent domain graphs informed by real integration usage. |
| v0.6 — Edge states | Unicode strings and collection extremes. | Strengthen testing use cases while preserving schema validity. |
| v0.7+ — Expansion | Playwright, JSON Schema/OpenAPI, ORM seeds, more schema adapters. | Broaden adoption without bloating core. |

## 15. MVP acceptance criteria

- A representative Zod object containing nested objects, arrays, enums, optionals and constrained primitives can be generated and passes schema.parse().

- The return type is inferred without manual generic parameters or casts.

- `fixture(schema, { seed: 123 })` returns identical output across repeated calls on the same package version.

- A user can override one nested field without manually providing unrelated required fields.

- `fixture.many(schema, 100, { seed })` returns 100 valid values and respects the same seed semantics.

- Email/UUID/URL/date and numeric/string constraints use sensible values rather than arbitrary placeholders.

- Unsupported schema constructs throw a documented typed error containing the failing schema path.

- The minimal getting-started example fits comfortably in a README screen and requires no configuration.

## 16. Success metrics

For an OSS library, early product metrics should validate usefulness and API quality rather than vanity download counts alone.

- Time-to-first-fixture: a new user can generate a typed fixture in < 5 minutes from install.

- Fixture compression: representative tests require materially fewer manually specified fields than hand-written factories.

- Validation reliability: generated values pass their source schema for all supported nodes in the automated compatibility suite.

- Reproducibility: seeded fuzz/property tests reproduce failures from the logged seed.

- Organic integrations: external issues/PRs request adapters or schema support, indicating the abstraction is useful beyond the demo.

- Real adoption signal: at least a few external repos use it in tests/stories rather than only starring the project.

## 17. Key risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Schema introspection becomes brittle | Keep adapters isolated; support an intentionally small documented subset first; maintain adapter compatibility tests. |
| “Valid” data is not semantically realistic | Use schema constraints for validity and provider hints/metadata for meaning. Do not pretend schemas encode all business semantics. |
| API becomes a complicated DSL | Maintain progressive disclosure. fixture(schema) must stay useful without defineFixture, scenarios or relations. |
| Faker dependency dominates bundle/runtime | Keep Faker behind a provider package and allow lighter/custom providers. |
| Relations explode complexity | Do not include in MVP. Define a small graph model and explicit cycle/cardinality rules before implementation. |
| Competing libraries cover schema-faking basics | Differentiate on fixtures, state/scenarios, coherent graphs and cross-tool reuse rather than only schema → random object. |
| Randomised tests become flaky | Seed all randomness; surface seed; avoid implicit wall-clock dependencies. |

## 18. Open-source product strategy

- License: permissive OSS license such as MIT unless there is a specific reason to choose otherwise.

- Monorepo: pnpm + changesets (or equivalent) to manage core/adapters independently.

- Public RFCs for API-shaping changes once external users appear.

- Small “good first issue” surface: provider handlers, schema-node support, examples and adapters.

- Compatibility table in docs rather than claiming full support for a schema library.

- Benchmarks for generation throughput only after correctness/API design stabilise.

## 19. Initial engineering backlog

| Epic | Area | First deliverables |
| --- | --- | --- |
| EPIC 1 | Core generation context | PRNG interface; seeded implementation; generation context; path tracking. |
| EPIC 2 | Internal schema IR | Minimal nodes for scalar/object/array/union-ish constructs; constraint metadata. |
| EPIC 3 | Zod adapter | Translate supported Zod nodes into generation plan/IR; compatibility tests. |
| EPIC 4 | Primitive generation | String/number/boolean/date/enum/literal/optional/nullable/array/object handlers. |
| EPIC 5 | Provider layer | Provider contract; Faker provider; semantic hint resolution. |
| EPIC 6 | Public fixture API | `fixture()`, `fixture.many()`, named options, seed, overrides; type tests. |
| EPIC 7 | Errors & diagnostics | UnsupportedNodeError, path, schema kind, docs link/hint. |
| EPIC 8 | Quality | Golden determinism tests; schema validation property tests; Node/version matrix. |
| EPIC 9 | Docs | Getting started; recipes; limitations; architecture; “Faker vs this project”. |

## 20. Open design questions

- How do we preserve stable seeded output when internals change between package versions? We probably guarantee reproducibility within a package version, not forever.

- Should optional fields be present by default, probabilistic, or policy-controlled? MVP should choose predictability over novelty.

- How should Zod transforms/refinements be handled? Some can only be validated, not inferred into a useful generator.

- What minimum relation DSL yields useful graphs without recreating an ORM?

## 21. Recommended product boundary

> **The product is not “modern Faker”.  Its defensible shape is a typed fixture + application-state engine that can use Faker underneath. Schema generation gets users in; scenarios, relations and adapters are what make the project worth adopting.**

The first development milestone should resist the temptation to build relations,
adapters or AI. The one-line schema → fixture experience and reusable fixture
definitions must remain excellent before higher-level features amplify them.
Once those foundations are solid, the next priority is fixture sets and
scenarios, where the project begins expressing multi-fixture application state.

## Appendix A — End-state usage sketch

```ts
const user = defineFixture(UserSchema, {
    defaults: { role: "member" },
})

const order = defineFixture(OrderSchema)

const commerce = defineFixtureSet({
  fixtures: { user, order },
  relations: {
    order: { userId: belongsTo("user") },
  },
  scenarios: {
    customerWithOrders: ({ create }) => {
      const customer = create("user", {
        overrides: { plan: "pro" },
      })
      const orders = create.many("order", 3, {
        overrides: { userId: customer.id },
      })
      return { customer, orders }
    },
  },
})

// Unit/component test
const state = commerce.createScenario("customerWithOrders", { seed: 42 })

// Storybook/MSW
export const ProCustomer = commerce.story("customerWithOrders")

// Playwright / local test env
await commerce.seed("customerWithOrders", { seed: 42 })
```

Working document: API names are illustrative. The implementation should preserve the product principles even if the final syntax changes.
