# FixtureSmith

FixtureSmith creates reproducible test data that expresses application intent.
Schema-derived generation supplies valid structure; fixtures and application
states add domain meaning.

## Language

**Fixture**:
A reproducible, schema-valid value tailored to a test or development need.
_Avoid_: Fake object, random object

**Fixture definition**:
A complete, reusable declaration for creating a **Fixture** of one schema-backed
type. It may provide domain defaults and named **Variants**.
_Avoid_: Factory, scenario

**Default**:
A static value or generation callback supplied by a **Fixture definition** when
no variant or per-call override provides that field.
_Avoid_: Field generator

**Derivation**:
A single atomic, typed calculation of one or more fields from a complete
provisional fixture. It expresses cross-field consistency without exposing
partial sibling state or ordering derived fields. It may use the session time
and collection index but does not generate random/provider values.
_Avoid_: Lifecycle hook, field generator

**Variant**:
A named, coherent configuration of one **Fixture definition**, such as an
administrator user or an expired-trial customer. A fixture uses at most one
variant at a time.
_Avoid_: Scenario, trait

**Application state**:
A coherent configuration of fixtures that represents a meaningful business
condition, such as an expired trial or a customer with unpaid orders.
_Avoid_: Mock data, sample data

**Scenario**:
An application-level recipe that produces an **Application state** from one or
more fixture definitions. A scenario may return one fixture but is never owned
by a single fixture definition.
_Avoid_: Variant, fixture state

**Fixture set**:
An optional, immutable composition of fixture definitions, scenarios, and their
relations. Its fixture definitions remain independently usable.
_Avoid_: Registry, application

**Generation session**:
The deterministic scope that creates one fixture, collection, or application
state. Every operation in a session shares one root seed, one `now` value, and
one primitive provider.
_Avoid_: Global context

**Optional policy**:
A generation-session choice between producing optional properties and omitting
them. The default is `present`.
_Avoid_: Sparse mode

**Nullable policy**:
A generation-session choice between producing non-null values and `null`. The
default is `value`.
_Avoid_: Sparse mode

**Schema generation**:
The creation of structurally valid values from a schema. It is FixtureSmith's
zero-configuration foundation, not its product identity.
_Avoid_: Fixture engine

## Example dialogue

> **Developer:** I can use schema generation when any valid customer will do.
>
> **Domain expert:** Use an application state when the test needs an expired
> trial, then override only the detail that matters to this example.
>
> **Developer:** I will use the customer's `expiredTrial` variant when I need
> only that fixture, and an `overdueCustomer` scenario when orders and payments
> must agree with it.
