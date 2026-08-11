# Dependency version policy

## Default

FixtureSmith uses the latest stable available version of each direct dependency
and development tool when adding or updating it. Dependencies are pinned exactly
in package manifests and the lockfile is committed so local development and CI
remain reproducible.

“Latest” means the latest stable release published by the dependency's official
distribution channel. Prereleases, release candidates, nightly builds, and
unstable distribution tags require a specific implementation need and explicit
review.

The package manager's registry release-age safeguard remains enabled. In this
repository, “available” means a stable release that also clears that supply-chain
policy. A newer release still inside the safety window is adopted after it ages
in and passes the complete verification suite.

## Compatibility exceptions

When the latest releases are not mutually compatible, use the newest compatible
combination and document:

- the dependency held back,
- the incompatible upstream requirement,
- the condition for removing the exception.

Do not suppress peer-dependency warnings merely to claim latest-version usage.
Recheck active exceptions whenever dependencies change.

## Active exceptions

| Dependency | Selected | Latest checked | Reason | Removal condition |
| --- | --- | --- | --- | --- |
| TypeScript | 6.0.3 | 7.0.2 | TypeScript-ESLint declares support below TypeScript 6.1. | TypeScript-ESLint supports TypeScript 7. |
| TypeScript-ESLint | 8.66.0 | 8.67.0 | Latest release is still inside pnpm's registry safety window. | Release clears the safety window. |
| Changesets | 2.31.1 | 3.0.0 | Latest release is still inside pnpm's registry safety window. | Release clears the safety window. |

Versions in this table reflect the last manual check, not a permanent pinning
recommendation.

## Update workflow

For dependency changes:

1. Query the official registry for current stable versions.
2. Update direct dependencies and the package-manager version.
3. Install without ignoring peer or engine warnings.
4. Run the complete `pnpm check` suite.
5. Review package contents and lockfile changes.
6. Add or remove compatibility exceptions in this document.

Automated dependency update tooling can be added after the initial repository and
CI workflow are established. It must follow the same compatibility and complete
verification rules.
