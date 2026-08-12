# Release readiness

## Status

The first release is ready for its Changesets version pull request and npm
release once the external npm scope and GitHub environment prerequisites in
[Release process](releasing.md) are met.

Package manifests intentionally remain at `0.0.0` in feature branches. The
pending changesets bump all three public packages to `0.1.0` through the release
workflow.

`0.1.0` is the first published version, but it carries more than the original
v0.1 milestone. Deterministic schema generation, reusable fixture definitions,
and fixture-set scenarios all landed before the first publish, so they ship
together.

## PRD acceptance evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Representative nested Zod schema validates | The public facade suite covers all required nodes over multiple seeds, a deeply nested representative schema, and `many(100)`. |
| Return type is inferred | Positive and negative compile fixtures exercise every public overload, recursive overrides, callback results, collection outputs, and scenario state shapes. |
| Seeded output replays | Unit, facade, provider-contract, invariant, and golden tests cover repeatability and path isolation. |
| A nested field can be overridden alone | Deep recursive override tests prove unrelated required fields are generated and remain stable. |
| `many(100)` is valid and deterministic | Collection acceptance tests validate count, replay, item index propagation, zero count, and item-zero equivalence. |
| Semantic and constrained values are useful | UUID, email, URL, strings, finite numbers, integers, dates, literals, enums, and arrays are parsed by their source schemas across a seed matrix. |
| Unsupported schemas fail actionably | The negative matrix asserts typed codes, exact structured paths, normalized seeds, provider operation context, Zod issues, and retained causes. |
| Reusable definitions replace factories | Definition tests cover defaults, one selected variant, derivation precedence, snapshot immutability, and session policies. |
| Scenarios produce application states | Fixture-set tests cover session sharing, whole-state replay, call isolation, scenario override precedence, recipe composition, and unknown-name errors. |
| Getting started is configuration-free | The root and package READMEs use only public package imports; the packed consumer test compiles and executes the same API shape. |

## Engineering definition of done

- `@fixturesmith/core` has no Zod or Faker dependency.
- Zod introspection is isolated in `@fixturesmith/zod` and produces a
  schema-neutral generation plan.
- Faker implements the public primitive-provider contract, and a deterministic
  custom provider is covered by the facade suite.
- Optional values are present and nullable values are non-null by default.
- Explicit optional and nullable session policies remain schema-valid and yield
  to overrides.
- Arrays replace atomically in overrides; nested object overrides merge.
- Reusable definitions infer defaults, variant names, derivation, and output
  types from their Zod schema.
- A fixture set is one generation session per scenario, and its definitions
  remain independently usable.
- ESM exports and declarations pass Publint and Are the Types Wrong checks.
- Packed artifacts contain runtime files, declarations, README, license, and no
  TypeScript build metadata.
- A clean offline consumer installs the three tarballs, type-checks, and runs.
- CI covers Node 22.18.0 and Node 26 with the frozen lockfile.
- The release workflow runs the same checks and publishes with npm provenance.

## Verification command

Run from the repository root:

```sh
pnpm check
pnpm changeset status
```

The first command is the complete local release gate. The second must list
`@fixturesmith/core`, `@fixturesmith/provider-faker`, and `@fixturesmith/zod` for
a minor bump before the initial version pull request is merged.

## Deliberate boundaries

The unsupported and deferred scope remains the one documented in
[Schema support](schema-support.md) and the PRD roadmap: no declared relations
or graph generation, no MSW, Storybook, Playwright, or ORM adapters, no
invalid-data or edge-state modes, no alternate schema inputs, and no CLI, AI, or
GUI tooling.
