# Overrides

Overrides express only the state a test cares about. Nested object overrides
merge recursively; arrays and dates replace the generated value atomically.

<<< ../../examples/overrides/src/index.ts

Callback overrides receive the collection item `index`, the typed field `path`,
the normalized root `seed`, a scoped `random` source, and a bound `provider`.
Callbacks must consume those deterministic sources rather than `Math.random()`
or wall-clock time.

Every completed value is still parsed by its source schema. Invalid static or
callback values throw `FixtureValidationError`.
