# ADR 0001: Immediate fixture API

- Status: Accepted
- Date: 2026-08-11

## Context

The PRD illustrates `fixture(schema)` both as a generated value and as an object
with `.seed()` and `.many()` methods. A normal value cannot also provide builder
methods without a proxy, wrapper, or misleading type. The product principle says
one-line generation should remain excellent.

## Decision

In v0.1, `fixture(schema, overrides?, options?)` immediately returns the parsed
schema output. Collection generation is `fixture.many(schema, count, overrides?,
options?)`. Seed and provider selection are options.

Fluent reusable behavior is deferred to `defineFixture()` in v0.2.

## Consequences

- Basic use is one direct expression.
- Results have honest Zod output types with no wrapper or unwrapping step.
- Seeded generation is slightly more verbose than `.seed(42)`.
- `many()` repeats the schema argument, but remains discoverable under `fixture`.
- The implementation avoids proxies and type/runtime mismatches.

## Alternatives considered

### Always return a builder

This would make `fixture(schema).many(20)` possible but require
`fixture(schema).create()` for the most common single value.

### Return an augmented or proxied generated value

This creates surprising enumeration, serialization, primitive, and TypeScript
behavior. It is not justified for the MVP.

### Separate top-level `many()` function

Technically simple, but less discoverable and likely to create naming collisions.
It can be added later only if real usage supports it.
