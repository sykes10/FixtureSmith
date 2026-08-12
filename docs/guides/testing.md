# Testing with seeds

Use a named seed for states worth recognizing in a test failure. The same schema,
configuration, provider, FixtureSmith version, and seed reproduce the same value.

<<< ../../examples/vitest/src/user.test.ts

FixtureSmith derives randomness from the logical path. Adding a sibling field or
overriding an unrelated field does not shift the existing values. Collection
items are isolated by their zero-based index.

Exact generated values may deliberately change between FixtureSmith releases.
Keep behavioral assertions focused on the state your test needs, and use the
same package version when replaying a failure.
