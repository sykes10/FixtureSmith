# Getting started

FixtureSmith is ESM-only and requires Node.js 22.18 or newer.

## Install

```sh
pnpm add -D @fixturesmith/zod zod
```

## Generate your first fixture

The complete example below is compiled and executed in CI.

<<< ../../examples/basic/src/index.ts

The return type is inferred as `z.output<typeof User>`. Generated output is
parsed by `User` before it is returned, and `"readme-demo"` reproduces the same
fixture on the same FixtureSmith version.

## Generate a collection

Use `fixture.many(schema, count, overrides?, options?)`. Every item has an
index-isolated random stream, so changing one item's callback does not perturb
the others.

## Next steps

- [Use deep and callback overrides](../guides/overrides.md)
- [Build replayable tests](../guides/testing.md)
- [Review supported Zod constructs](../schema-support.md)
- [Run all repository demos](../guides/examples.md)
