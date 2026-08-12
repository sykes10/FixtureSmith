# Runnable examples

Every example is an independent workspace package. CI type-checks and executes
them, and the documentation imports their source rather than maintaining copied
snippets.

| Example | Demonstrates | Run locally |
| --- | --- | --- |
| `basic` | Immediate generation, `many()`, and a reusable definition | `pnpm --filter @fixturesmith-example/basic check` |
| `overrides` | Deep static and callback overrides | `pnpm --filter @fixturesmith-example/overrides check` |
| `vitest` | A replayable fixture in a real test | `pnpm --filter @fixturesmith-example/vitest check` |
| `custom-provider` | Replacing Faker through the provider contract | `pnpm --filter @fixturesmith-example/custom-provider check` |

Run the complete set with:

```sh
pnpm examples:check
```

[Open the repository in StackBlitz](https://stackblitz.com/github/sykes10/FixtureSmith?file=examples/basic/src/index.ts&startScript=demo%3Abasic)
to explore the basic example without a local setup.

## Basic

<<< ../../examples/basic/src/index.ts

## Custom provider

<<< ../../examples/custom-provider/src/index.ts
