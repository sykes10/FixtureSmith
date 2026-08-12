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

Use `fixture.many(schema, count, options?)`, passing custom values through
`options.overrides`. Every item has an index-isolated random stream, so changing
one item's callback does not perturb the others.

## Define a reusable fixture

Use `defineFixture(schema, config?)` when tests share domain defaults or named
variants. The definition remains bound to its source schema, so `create()` and
`many()` retain the inferred Zod output type.

```ts
const user = defineFixture(User, {
  defaults: { role: "member" },
  variants: {
    admin: { role: "admin" },
  },
})

user.create({ variant: "admin", seed: 42 })
```

## Next steps

- [Use deep and callback overrides](../guides/overrides.md)
- [Build replayable tests](../guides/testing.md)
- [Review supported Zod constructs](../schema-support.md)
- [Run all repository demos](../guides/examples.md)
