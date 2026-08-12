# Contributing to FixtureSmith

Thank you for helping make deterministic test data easier to use.

## Before opening an issue

- Search existing issues and discussions.
- Check the documented [schema support matrix](docs/schema-support.md).
- Reduce bugs to the smallest schema, seed, and FixtureSmith version that
  reproduces the behavior.
- Do not include production data, credentials, or other sensitive information.

Security vulnerabilities belong in the private process described by
[SECURITY.md](SECURITY.md), not a public issue.

## Local setup

FixtureSmith is ESM-only and requires Node.js 22.18 or newer.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

Useful focused commands:

```sh
pnpm test
pnpm test:watch
pnpm typecheck
pnpm examples:check
pnpm docs:dev
pnpm packages:check
```

## Making a change

1. Read the relevant architecture and domain documents under `docs/`.
2. Add a failing test or type fixture that proves the desired behavior.
3. Implement the smallest schema-neutral change that makes it pass.
4. Update the schema matrix, API reference, and executable example when the
   public surface changes.
5. Run `pnpm check`.
6. Add a Changeset for changes affecting a published package:

   ```sh
   pnpm changeset
   ```

Core must remain independent of Zod and Faker. Zod-specific introspection stays
in `@fixturesmith/zod`, and primitive realism stays behind the provider contract.

## Pull requests

Keep pull requests focused and explain the behavior and rationale. Include the
reproduction seed for generation bugs. PRs must pass formatting, linting, strict
type checks, runtime tests, executable examples, docs builds, and packed-consumer
validation.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
