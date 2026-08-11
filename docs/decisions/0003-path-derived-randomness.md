# ADR 0003: Path-derived deterministic randomness

- Status: Accepted
- Date: 2026-08-11

## Context

A single mutable PRNG consumed during depth-first traversal is reproducible only
while traversal order and every random draw remain unchanged. Adding a field or
static override then shifts unrelated downstream values, making fixtures harder
to review and replay.

## Decision

Normalize a root seed and derive scoped random streams from the typed logical
path and operation purpose. Object properties and array indexes receive child
paths. Providers and callbacks consume only the stream supplied for their current
operation.

Single generation uses item path index zero, matching the first result of
`fixture.many(..., 1)`.

## Consequences

- Unrelated fields remain stable when a sibling is added or overridden.
- Collection items are isolated by index and could later be generated in
  parallel.
- Path encoding and derivation become version-visible algorithms requiring
  golden tests.
- A field whose own schema or generator changes may still change, as expected.
- Exact values remain guaranteed only within a FixtureSmith version.

## Alternatives considered

### One mutable root PRNG

Simpler, but fragile to traversal and implementation changes.

### Store a separate random seed in every IR node

This couples normalization to a generation session and prevents reuse of an
immutable normalized plan.

### Guarantee output forever

This would freeze algorithms and provider versions too early. Version-scoped
reproducibility is sufficient for replaying test failures.
