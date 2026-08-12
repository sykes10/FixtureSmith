# GitHub repository setup

The repository contains all source and workflows required for documentation and
demos. A maintainer must apply these one-time GitHub settings after the branch is
pushed.

## About section

- Description: `Deterministic typed fixtures from Zod schemas`
- Website: `https://sykes10.github.io/FixtureSmith/`
- Topics: `typescript`, `testing`, `fixtures`, `zod`, `faker`, `test-data`

Enable **Discussions** so the issue chooser can direct questions and broad design
conversations away from the bug tracker.

## GitHub Pages

In **Settings → Pages**, set **Source** to **GitHub Actions**. The Documentation
workflow builds the executable examples, builds VitePress, uploads the static
artifact, and deploys it with GitHub's OIDC-based Pages action.

The configured project base is `/FixtureSmith/`. If the repository is renamed,
update `base` and the Open Graph URL in `docs/.vitepress/config.ts`.

## Social preview

In **Settings → General → Social preview**, upload:

`docs/public/fixturesmith-social-preview.png`

The asset is exactly 1280 × 640 pixels. VitePress also publishes it as the Open
Graph image for the documentation site.

## Security and releases

- Enable **Private vulnerability reporting** under **Settings → Security** so
  `SECURITY.md` has a private intake route.
- Create the protected `npm` environment used by the release workflow.
- Add `NPM_TOKEN` after confirming ownership of the `@fixturesmith` npm scope.
- Keep required reviews and CI checks enabled for the default branch.

No npm publish is part of the documentation deployment.
