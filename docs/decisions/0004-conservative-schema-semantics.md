# ADR 0004: Conservative schema semantics

- Status: Accepted
- Date: 2026-08-11

## Context

Optional and nullable schemas permit multiple valid shapes. Refinements,
transforms, arbitrary regexes, and recursive schemas may be validatable without
being usefully generatable from introspection. Probabilistic omission and retries
would make ordinary fixtures sparse and create unbounded or flaky behavior.

## Decision

For v0.1:

- optional object properties are generated and present by default,
- nullable values are generated non-null by default,
- every final value is parsed by the source schema,
- unsupported or opaque constructs fail with a structured path error,
- arbitrary validation-and-retry is not a generation strategy,
- transforms, opaque refinements, arbitrary regexes, and other unmodellable nodes
  begin as unsupported unless separately proven and documented.

Users can explicitly override fields to `undefined` or `null` when their inferred
types allow it.

## Consequences

- Default fixtures are populated and convenient for common tests.
- Sparse and null-heavy states remain possible through explicit overrides.
- FixtureSmith does not overclaim universal Zod support.
- Some schemas require custom overrides or future handlers.
- Boundary, sparse, invalid, and unusual-data modes remain clean later features.

## Alternatives considered

### Randomly omit or null values

This increases variety but reduces predictability and usefulness for ordinary
component and API fixtures.

### Retry until every refinement passes

Opaque predicates may be impossible or extremely unlikely, so retry behavior
cannot offer a reliable validity contract.

### Ignore unsupported checks

This would return invalid data or make validation failure messages appear far
from their true source.
