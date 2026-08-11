# Deterministic generation

## Contract

For a fixed FixtureSmith version, these inputs define a generation result:

- normalized root seed
- normalized schema plan
- overrides
- generation options
- provider implementation and version

Repeating the same inputs produces deeply equal values. FixtureSmith does not
promise byte-for-byte output stability across releases.

## Seed input and normalization

The public API accepts finite JavaScript numbers and strings.

- Reject `NaN`, positive or negative infinity, and unsupported input types.
- Distinguish strings from numbers: `42` and `"42"` need not normalize equally.
- Normalize using an explicitly chosen, tested, platform-independent hash.
- Store the normalized root seed in a fixed-width representation.
- Do not use JavaScript's implementation-dependent object hashing.

The concrete hash and PRNG algorithms must be named in code comments and golden
tests when selected. They should be small, deterministic, and dependency-free.
Cryptographic security is not a requirement.

## Scoped random streams

Randomness is derived from the root seed and logical path:

```text
derive(rootSeed, pathSegments, purpose) -> RandomSource
```

Example paths:

```text
[0, "id"]
[0, "profile", "displayName"]
[3, "orders", 2, "total"]
```

The optional purpose discriminator separates independent decisions at the same
path, such as array length and array item generation.

Benefits:

- A new sibling field does not shift every later random value.
- A static override does not need to consume discarded randomness.
- Collection items can be generated independently or in parallel later.
- Provider operations cannot perturb unrelated fields.

Path encoding must be unambiguous. For example, the string field `"0"` must not
collide with numeric index `0`, and adjacent segments must include type and length
information rather than simple string joining.

## `fixture()` and `fixture.many()`

Single-value generation uses logical item index zero. Therefore:

```ts
fixture(Schema, overrides, { seed })
```

must equal:

```ts
fixture.many(Schema, 1, overrides, { seed })[0]
```

This equivalence is part of the API contract and must have a golden test.

## Object ordering

The Zod adapter preserves schema property order in the IR for diagnostics and
trace readability. Correct deterministic output must not depend on JavaScript
object traversal order because each property gets a path-derived stream.

## Arrays

Array length and each element use separate purpose/path derivations:

```text
path [0, "tags"], purpose "array-length"
path [0, "tags", 0], purpose "node-value"
```

Changing the generated array length must not alter values at indexes that remain
present, unless the schema or provider configuration also changes.

## Providers

A provider receives a random source scoped to the current node and operation. It
must not:

- call `Math.random()`
- use a process-global Faker singleton with unrelated state
- read the current time
- use locale or environment data without explicit configuration

The Faker provider may create a provider session or adapt Faker's randomizer, but
the engine remains the owner of the root random context.

## Dates and time

Generating a `Date` must use deterministic bounds and scoped randomness. It must
not use `Date.now()` as an implicit bound. The v0.1 default date interval must be
fixed and documented in code; schema constraints narrow that interval.

Scenario-relative `now` belongs to v0.3 and is not part of this contract.

## Overrides

- Static overrides consume no randomness.
- Callback overrides receive a scoped random source derived from their field path
  and an `"override"` purpose.
- Callback implementation is assumed deterministic. FixtureSmith cannot make a
  callback deterministic if user code reads the clock, environment, or global
  randomness.
- Whether an override is present must not alter unrelated generated paths.

## Change policy

Changes to any of the following require reviewing golden fixtures and noting the
output change in release notes:

- seed normalization or path encoding
- PRNG algorithm
- IR path assignment
- default constraints or array lengths
- provider algorithms or provider major version
- random purpose labels

Golden tests detect accidental changes; they do not prohibit deliberate versioned
improvements.
