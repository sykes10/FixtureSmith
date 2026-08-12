# @fixturesmith/zod

## 0.1.0

### Minor Changes

- 22be9a0: Release schema-first deterministic generation and reusable fixture
  definitions for Zod.
- 152c12f: Add `defineFixtureSet` for composing fixture definitions into named
  scenarios. A scenario builds a coherent multi-fixture application state in one
  generation session, replays entirely from its seed, accepts per-test overrides
  keyed by fixture name, and keeps its definitions independently usable.

### Patch Changes

- Updated dependencies [22be9a0]
  - @fixturesmith/core@0.1.0
  - @fixturesmith/provider-faker@0.1.0
