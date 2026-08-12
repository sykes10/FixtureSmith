# Zod schema support for v0.1

## Support policy

FixtureSmith supports a documented subset of Zod, not every construct that Zod
can parse. A construct is supported only when:

1. the adapter can normalize it without relying on unstable guesswork,
2. the engine can generate a useful value deterministically, and
3. compatibility tests prove generated values pass the original schema.

The package supports Zod `^4.0.0`, with compatibility tested against the pinned
workspace release. Zod introspection is isolated in `@fixturesmith/zod`.

## Required MVP matrix

| Construct | v0.1 behavior |
| --- | --- |
| Object | Generate every required property recursively. |
| String | Generate a non-empty value satisfying supported length checks. |
| String min/max/length | Respect compatible inclusive length bounds. |
| UUID | Generate a valid UUID using the provider. |
| Email | Generate a valid email using the provider. |
| URL | Generate a valid URL using the provider. |
| Number | Generate a finite number in supported bounds. |
| Integer | Generate an integer in supported bounds. |
| Number min/max | Respect inclusive and exclusive bounds. |
| Boolean | Generate a deterministic boolean. |
| Date | Generate a valid `Date` within supported bounds. |
| Literal | Return the literal exactly. |
| Enum | Select one member deterministically. |
| Array | Generate a valid deterministic length and recurse into items. |
| Array min/max/length | Respect compatible cardinality bounds. |
| Optional | Generate the wrapped value by default. |
| Nullable | Generate the wrapped non-null value by default. |
| Nested combinations | Recurse with full schema path tracking. |

## Candidate stretch support

These can enter v0.1 only after all required nodes are complete and each addition
has focused compatibility tests:

- simple unions where at least one branch is fully supported
- discriminated unions with a supported discriminator
- tuples
- records with finite enum keys
- common string patterns that map to explicit provider operations
- `multipleOf` where a valid bounded value can be calculated safely

They are not blockers for the first release.

## Explicitly unsupported in the first pass

The adapter throws UnsupportedSchemaError for constructs it cannot model,
including initially:

- transforms and pipelines
- preprocessors and coercion whose input semantics matter
- opaque custom refinements
- arbitrary regular expressions
- promises, functions, symbols, maps, and sets
- recursive/lazy schemas
- intersections
- unrestricted records
- schemas accepting arbitrary unknown values

Some of these may become supportable after the core path is stable. The error
must name the source construct and schema path.

## Strings

Resolve length constraints into an interval. If the interval is empty, throw an
InvalidSchemaConstraintError before calling a provider.

Semantic formats such as email, UUID, and URL are separate normalized hints. A
semantic generator must also satisfy compatible length constraints. If it cannot,
fail explicitly; do not truncate formatted values into invalid strings.

Arbitrary regex generation is excluded because validation-and-retry has no
bounded success guarantee. A future release can support documented regex subsets
or a dedicated handler registration mechanism.

## Numbers

The normalized plan records inclusive/exclusive minimum and maximum plus integer
requirements. Generation must account for JavaScript numeric precision and reject
an interval containing no representable supported value.

Do not generate `NaN` or infinity unless the schema construct is explicitly
added to the compatibility table.

## Arrays

When unconstrained, v0.1 uses a small deterministic default range selected during
implementation and locked by tests. Required behavior:

- exact length wins over min/max defaults,
- generated length remains within min/max,
- impossible constraints fail during normalization or generation,
- every item receives a numeric path segment.

No uniqueness guarantee is implied unless a later schema construct explicitly
requests it.

## Optional and nullable values

Conservative defaults make ordinary fixtures useful:

- optional object properties are present,
- nullable values are non-null,
- optional-and-nullable values are present and non-null.

Users can explicitly override a supported property to `undefined` or `null` when
the inferred output type allows it. Sparse/null/boundary modes are deferred.

For object output, an override of `undefined` follows Zod's parsed output
semantics. FixtureSmith does not independently promise whether the key remains
present after parsing.

## Defaults, catches, transforms, and refinements

These constructs blur input and output generation. Initial behavior is to reject
them unless a focused implementation decision adds one to the supported matrix.
The adapter must never silently strip validation or return an unparsed input.

## Validation and retries

Every result is parsed by the original schema once. Parse failure means the
adapter, engine, provider, override, or callback produced an invalid result.

The engine must not retry arbitrary root generation until a refinement happens to
pass. Bounded retries are permissible only for a documented, supported generator
where the success condition and maximum attempts are explicit.

## Adding support

To add a Zod construct:

1. Add or extend a schema-neutral IR node only if core behavior truly differs.
2. Normalize the construct in the Zod adapter.
3. Add positive compatibility tests that parse generated values.
4. Add deterministic and multiple-seed coverage.
5. Add negative tests for impossible constraints.
6. Add type inference tests.
7. Update this matrix and public limitations documentation.
