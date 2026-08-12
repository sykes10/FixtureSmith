# Release process

FixtureSmith publishes its three packages together through Changesets and GitHub
Actions. The repository does not publish from developer machines.

## Package set

- `@fixturesmith/core`
- `@fixturesmith/provider-faker`
- `@fixturesmith/zod`

Each package is public, ESM-only, MIT licensed, and requires Node.js 22.18 or
newer. The Zod facade declares Zod `^4.0.0` as a peer dependency.

## Changesets

Any pull request changing published behavior or declarations includes a
changeset:

```sh
pnpm changeset
```

Merging a changeset to `main` causes the release workflow to maintain a version
pull request. That pull request applies versions and changelogs. Merging the
version pull request causes the same workflow to publish the resulting package
versions.

## Verification

Both CI and the release workflow run `pnpm check`. This proves:

- formatting, linting, runtime tests, and negative type tests,
- TypeScript project-reference builds,
- Publint package metadata checks,
- ESM declaration analysis with Are the Types Wrong,
- absence of build metadata in tarballs,
- presence of license and package README files,
- offline installation of all packed packages into a clean consumer,
- consumer TypeScript compilation and Node execution.

CI tests the minimum Node version and Node 26, the current release line when the
workflow was authored.

## npm configuration

The GitHub `npm` environment must define an `NPM_TOKEN` secret authorized to
publish the three public packages. The workflow grants OIDC identity-token
permission and enables npm provenance for every publish.

Before the first release, the maintainer must confirm ownership of the
`@fixturesmith` npm scope. Package publication is intentionally not attempted by
local verification.

## Reproducibility changes

Any deliberate change to seed normalization, path encoding, PRNG behavior,
provider algorithms, default ranges, or purpose labels must:

1. update the golden determinism test,
2. receive explicit review as an output change,
3. appear in release notes.

FixtureSmith guarantees replay within a package version, not identical generated
values forever across releases.
