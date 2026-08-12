import { execFileSync } from "node:child_process"
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"

// Spawn the pnpm that invoked this script. Resolving `corepack` or `pnpm` from
// PATH finds a .cmd shim on Windows, which Node refuses to spawn without a
// shell, and enabling a shell would put user-controlled paths through cmd
// quoting. npm_execpath is pnpm's own entry point: a JavaScript file under
// corepack, or a native executable for a standalone install.
const pnpmEntry = process.env.npm_execpath
if (pnpmEntry === undefined) {
  throw new Error(
    "check-packages must run through pnpm. Use `pnpm packages:check`.",
  )
}
const pnpmEntryIsScript = /\.[cm]?js$/i.test(pnpmEntry)

const root = resolve(import.meta.dirname, "..")

// The consumer project is installed by the pnpm that invoked this script rather
// than by whichever pnpm a shell resolves, so confirm it matches the pinned
// release. A stale major silently changes lockfile and workspace semantics.
assertPinnedPnpm()

const modulesManifest = readFileSync(
  join(root, "node_modules", ".modules.yaml"),
  "utf8",
)
const storeDirectory = modulesManifest.match(
  /^\s*"?storeDir"?:\s*"([^"]+)"/m,
)?.[1]
if (storeDirectory === undefined) {
  throw new Error(
    "Could not determine pnpm store from node_modules/.modules.yaml.",
  )
}
const temporaryDirectory = mkdtempSync(join(tmpdir(), "fixturesmith-consumer-"))
const tarballDirectory = join(temporaryDirectory, "tarballs")
const consumerDirectory = join(temporaryDirectory, "consumer")
const packages = ["core", "provider-faker", "zod"]

try {
  mkdirSync(tarballDirectory)

  for (const packageName of packages) {
    runPnpm(
      [
        "--dir",
        join(root, "packages", packageName),
        "pack",
        "--pack-destination",
        tarballDirectory,
      ],
      root,
    )
  }

  const tarballs = readdirSync(tarballDirectory)
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => join(tarballDirectory, file))

  if (tarballs.length !== packages.length) {
    throw new Error(
      `Expected ${packages.length} tarballs, found ${tarballs.length}.`,
    )
  }

  for (const tarball of tarballs) {
    runPnpm(["exec", "attw", tarball, "--profile", "esm-only"], root)
    assertTarballExcludesBuildMetadata(tarball)
  }

  mkdirSync(consumerDirectory)
  // Forward slashes keep the specifier valid in both JSON and YAML. A Windows
  // path would otherwise read as an escape sequence in a double-quoted scalar.
  const tarball = (name) => {
    const match = tarballs.find((file) => file.includes(name))
    if (match === undefined) throw new Error(`Missing ${name} tarball.`)
    return `file:${match.replaceAll("\\", "/")}`
  }

  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify(
      {
        name: "fixturesmith-consumer-test",
        packageManager: "pnpm@11.21.0",
        private: true,
        type: "module",
        dependencies: {
          "@fixturesmith/core": tarball("core-"),
          "@fixturesmith/provider-faker": tarball("provider-faker"),
          "@fixturesmith/zod": tarball("zod-"),
          zod: "4.4.3",
        },
        devDependencies: {
          typescript: "6.0.3",
        },
      },
      null,
      2,
    ),
  )
  writeFileSync(
    join(consumerDirectory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          outDir: "dist",
          strict: true,
          target: "ES2022",
        },
        include: ["index.ts"],
      },
      null,
      2,
    ),
  )
  writeFileSync(
    join(consumerDirectory, "pnpm-workspace.yaml"),
    `overrides:
  "@fixturesmith/core": "${tarball("core-")}"
  "@fixturesmith/provider-faker": "${tarball("provider-faker")}"
`,
  )
  writeFileSync(
    join(consumerDirectory, "index.ts"),
    `import {
  defineFixture,
  defineFixtureSet,
  fixture,
} from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({ id: z.uuid(), name: z.string().min(3) })
const user = fixture(User, { overrides: { name: "Ada" }, seed: 42 })
const users = fixture.many(User, 3, { seed: 42 })
const userDefinition = defineFixture(User, {
  variants: { named: { name: "Ada" } },
})
const named = userDefinition.create({ seed: 42, variant: "named" })

const app = defineFixtureSet({
  fixtures: { user: userDefinition },
  scenarios: {
    team: ({ create }) => ({
      lead: create("user", { variant: "named" }),
      members: create.many("user", 2),
    }),
  },
})
const team = app.createScenario("team", { seed: 42 })

if (
  user.name !== "Ada" ||
  users.length !== 3 ||
  named.name !== "Ada" ||
  team.lead.name !== "Ada" ||
  team.members.length !== 2
) {
  throw new Error("Packed package consumer assertion failed.")
}
`,
  )

  runPnpm(
    ["install", "--offline", "--ignore-scripts", "--store-dir", storeDirectory],
    consumerDirectory,
  )
  runPnpm(["exec", "tsc"], consumerDirectory)
  run(
    process.execPath,
    [join(consumerDirectory, "dist", "index.js")],
    consumerDirectory,
  )
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true })
}

function runPnpm(arguments_, cwd) {
  if (pnpmEntryIsScript) {
    run(process.execPath, [pnpmEntry, ...arguments_], cwd)
    return
  }
  run(pnpmEntry, arguments_, cwd)
}

function assertPinnedPnpm() {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
  const pinned = manifest.packageManager?.replace(/^pnpm@/, "")
  if (pinned === undefined) {
    throw new Error("Root package.json is missing a packageManager pin.")
  }

  const actual = execFileSync(
    pnpmEntryIsScript ? process.execPath : pnpmEntry,
    pnpmEntryIsScript ? [pnpmEntry, "--version"] : ["--version"],
    { cwd: root, encoding: "utf8" },
  ).trim()

  if (actual.split(".")[0] !== pinned.split(".")[0]) {
    throw new Error(
      `This script ran under pnpm ${actual}, but the repository pins ${pinned}. ` +
        "Run `corepack enable` so pnpm resolves to the pinned release, or " +
        "invoke the command as `corepack pnpm packages:check`.",
    )
  }
}

function run(command, arguments_, cwd) {
  execFileSync(command, arguments_, {
    cwd,
    env: { ...process.env, CI: "true" },
    stdio: "inherit",
  })
}

// GNU tar reads a leading `C:` as a remote host, so run from the tarball's own
// directory and pass a bare file name instead of relying on --force-local,
// which bsdtar does not accept.
function tar(arguments_, cwd) {
  return execFileSync("tar", arguments_, { cwd, encoding: "utf8" })
}

function assertTarballExcludesBuildMetadata(tarball) {
  const directory = dirname(tarball)
  const file = basename(tarball)
  const listing = tar(["-tzf", file], directory)
  if (listing.includes(".tsbuildinfo") || listing.includes(".d.ts.map")) {
    throw new Error(`Build metadata leaked into ${tarball}.`)
  }
  if (!listing.split("\n").some((entry) => entry.endsWith("README.md"))) {
    throw new Error(`Missing package README in ${tarball}.`)
  }

  const packageJsonEntry = listing
    .split("\n")
    .find((entry) => entry.endsWith("package.json"))
  if (packageJsonEntry === undefined)
    throw new Error(`Missing package.json in ${tarball}.`)

  const packageJson = JSON.parse(
    tar(["-xOf", file, packageJsonEntry], directory),
  )
  if (packageJson.license !== "MIT") {
    throw new Error(`Missing MIT license metadata in ${tarball}.`)
  }
}
