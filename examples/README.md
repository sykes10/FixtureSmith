# FixtureSmith examples

These independent workspace packages are the canonical runnable examples used by
the README and documentation site.

| Directory | Purpose |
| --- | --- |
| [`basic`](basic/) | One fixture, typed overrides, and collections |
| [`overrides`](overrides/) | Deep static and callback overrides |
| [`vitest`](vitest/) | Seeded fixture replay in a test |
| [`custom-provider`](custom-provider/) | A provider with no Faker dependency |

From the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm examples:check
```

Or [open the basic demo in StackBlitz](https://stackblitz.com/github/sykes10/FixtureSmith?file=examples/basic/src/index.ts&startScript=demo%3Abasic).
