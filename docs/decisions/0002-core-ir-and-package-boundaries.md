# ADR 0002: Core IR and package boundaries

- Status: Accepted
- Date: 2026-08-11

## Context

FixtureSmith starts with Zod but intends to support other schema sources later.
It also uses Faker for primitive realism without making Faker the engine. Putting
Zod introspection and Faker calls into one recursive generator would make both
dependencies permanent and future adapters difficult to test.

## Decision

Use three v0.1 packages:

- `@fixturesmith/core` owns schema-neutral IR, PRNG, generation, provider
  contracts, and shared errors.
- `@fixturesmith/provider-faker` implements the provider contract.
- `@fixturesmith/zod` translates Zod into IR and exposes the typed convenience
  API with the default provider wired in.

Normalize a schema completely before generation. Core interprets IR and never
introspects a Zod object.

The IR models only constructs required by the current adapter and MVP. A second
adapter may motivate generalization later.

## Consequences

- Core remains dependency-light and independently testable.
- Zod compatibility breakage is isolated to one package.
- Provider implementations are replaceable.
- A value crosses an adapter boundary before generation, adding some code and
  allocation.
- The Zod convenience package depends on the default provider to preserve
  zero-config use.

## Alternatives considered

### Generate directly from Zod internals

This is initially shorter but spreads adapter concerns through recursion and
couples core errors and constraints to Zod.

### Design a universal schema IR up front

Without a second implemented adapter, this risks abstracting imaginary common
behavior and weakening the first adapter.

### Put Faker in core

This conflicts with the provider requirement and gives consumers no lighter or
domain-specific provider option.
