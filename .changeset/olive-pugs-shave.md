---
"@fixturesmith/zod": minor
---

Add `defineFixtureSet` for composing fixture definitions into named scenarios.
A scenario builds a coherent multi-fixture application state in one generation
session, replays entirely from its seed, accepts per-test overrides keyed by
fixture name, and keeps its definitions independently usable.
