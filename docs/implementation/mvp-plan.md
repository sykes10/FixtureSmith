# v0.1 implementation plan

## Goal

Ship the narrow polished path defined by the PRD:

```text
Zod schema -> valid deterministic typed fixture
```

The plan uses vertical milestones. Each milestone leaves an executable,
reviewable capability rather than only scaffolding a future layer.

## Definition of done for v0.1

- All required rows in the schema support matrix generate valid values.
- Public return and override types infer from Zod schemas.
- Seeded single and collection generation satisfy deterministic invariants.
- Static and callback overrides work recursively.
- Faker operates behind the provider contract.
- Unsupported schemas and impossible constraints produce structured path errors.
- Built packages work from a clean consumer project.
- README examples reflect tested package exports.

## Milestone 0: repository foundation

### Deliverables

- Root workspace manifest and pinned package manager
- Shared strict TypeScript configuration
- `core`, `provider-faker`, and `zod` package manifests
- ESM package exports and build pipeline
- Test, lint, format, type-test, and package-check scripts
- CI across declared Node support
- Changesets configuration
- Explicit license

### Exit criteria

- A trivial export can be built and imported from each packed package.
- Workspace commands run from the root with a frozen lockfile.
- There are no undeclared cross-package imports.

### Decisions to finalize

- Supported Node and TypeScript ranges
- Supported Zod and Faker ranges
- Build and declaration-generation tools
- Test and type-test tools
- Exact package scope availability

Use current official documentation when selecting exact versions; do not encode
version guesses from this planning document.

## Milestone 1: deterministic walking skeleton

Implement the smallest complete vertical slice:

```ts
const schema = z.object({ name: z.string() })
const value = fixture(schema, undefined, { seed: 42 })
schema.parse(value)
```

### Core

- number/string seed validation and normalization
- path encoding and scoped random source
- string and object IR nodes
- recursive generation context
- minimal primitive provider contract

### Zod

- normalize Zod object and plain string nodes
- typed `fixture()` facade
- validate through original schema before return

### Provider

- minimal deterministic string fallback
- facade wiring with no consumer configuration

### Tests

- repeated seed equality
- different path independence
- schema parse success
- inferred result type
- clean-package import

### Exit criteria

The example above works through built package exports. No layer imports private
source from another package.

## Milestone 2: primitive completeness

Add one end-to-end node at a time:

1. string length constraints
2. semantic UUID, email, and URL strings
3. number, integer, and bounds
4. boolean
5. date with deterministic fixed defaults and bounds
6. literal
7. enum

For each node, add core unit tests, Zod compatibility tests across seeds, type
tests, and impossible-constraint errors before starting the next node.

### Exit criteria

All primitive rows in the required support matrix pass source-schema validation.

## Milestone 3: recursive composition

### Deliverables

- nested objects with full paths
- arrays and array cardinality constraints
- optional wrapper with present-by-default policy
- nullable wrapper with non-null-by-default policy
- representative acceptance schema
- `many(100)` engine capability can be internal at this stage

### Exit criteria

The representative acceptance schema validates across a seed matrix, and deep
unsupported nodes report their exact path.

## Milestone 4: overrides

### Deliverables

- recursive TypeScript override type
- static scalar and array replacement
- recursive object merging
- deterministic callback overrides
- callback index, path, random source, and bound provider
- validation failure attribution

### Tests

- deep single-field override without unrelated required values
- arrays replace rather than merge by index
- callbacks run once per relevant field and item
- static overrides do not perturb unrelated paths
- compile failures for unknown keys, bad static values, and bad callback outputs

### Exit criteria

A consumer can describe only the business-relevant portion of a deeply nested
fixture while the rest remains generated and valid.

## Milestone 5: public collection API

### Deliverables

- `fixture.many()` facade and types
- non-negative safe-integer count validation
- item index propagation
- single/item-zero equivalence
- zero-count behavior

### Exit criteria

`many(100)` returns 100 valid typed values, repeated seeds replay exactly, and
item paths include their numeric indexes.

## Milestone 6: provider hardening

The minimal provider exists from Milestone 1; this milestone completes its public
contract and Faker implementation.

### Deliverables

- stable provider and bound-provider interfaces
- Faker implementation for semantic primitives
- provider contract suite
- custom provider example
- provider error wrapping
- dependency/bundle inspection

### Exit criteria

Core has no Faker dependency, the Zod facade remains zero-config, custom providers
can be injected, and all provider output remains seed-controlled.

## Milestone 7: diagnostics and unsupported boundary

### Deliverables

- FixtureError base class and stable codes
- UnsupportedSchemaError
- InvalidSchemaConstraintError
- InvalidFixtureOptionsError
- FixtureValidationError
- ProviderError
- structured paths, seed metadata, and retained causes
- negative compatibility matrix

### Exit criteria

Every expected failure category is actionable without inspecting FixtureSmith
source, and no unsupported construct silently produces placeholder data.

## Milestone 8: release hardening

### Deliverables

- getting-started and API README finalized against tests
- compatibility/limitations table published
- architecture and provider author documentation reviewed
- package tarball consumer tests
- export and declaration checks
- changelog and initial release changeset
- release workflow and provenance decisions

### Exit criteria

A new TypeScript project can install the packages, copy the README example, and
produce its first typed fixture in under five minutes.

## Suggested first issues

Create issues as vertical slices rather than one issue per internal file:

1. Bootstrap publishable three-package workspace.
2. Generate a deterministic Zod object containing a string.
3. Support constrained and semantic strings.
4. Support bounded numbers and integers.
5. Support boolean, date, literal, and enum nodes.
6. Support nested arrays and objects.
7. Support optional and nullable wrappers.
8. Add recursive typed static overrides.
9. Add deterministic override callbacks.
10. Publish `fixture.many()` behavior.
11. Complete the Faker provider contract.
12. Complete structured diagnostics and negative tests.
13. Harden packages and docs for v0.1 release.

Each issue should list the public example it enables and tests required for exit.

## Scope guard

Reject or defer implementation work involving:

- `defineFixture()`
- defaults, composition, or lifecycle hooks
- scenarios or deterministic scenario time
- relationships and graph generation
- MSW, Storybook, Playwright, or ORM adapters
- invalid, sparse, boundary, or Unicode modes
- a second schema adapter
- schema caching or performance benchmarks without evidence
- CLI, network services, AI, or GUI work

These features matter, but they do not improve the v0.1 proof until the one-line
generation path is complete.

## Work order rules

- Build the walking skeleton before broad schema support.
- Add a test for every compatibility row as the implementation lands.
- Keep changes small enough that deterministic output changes are reviewable.
- Update behavioral docs and tests together.
- Do not expose an internal abstraction merely to make future work imaginable.
