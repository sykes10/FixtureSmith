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
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
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
    run(
      "corepack",
      [
        "pnpm",
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
    run(
      "corepack",
      ["pnpm", "exec", "attw", tarball, "--profile", "esm-only"],
      root,
    )
    assertTarballExcludesBuildMetadata(tarball)
  }

  mkdirSync(consumerDirectory)
  const tarball = (name) => {
    const match = tarballs.find((file) => file.includes(name))
    if (match === undefined) throw new Error(`Missing ${name} tarball.`)
    return `file:${match}`
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
    `import { fixture } from "@fixturesmith/zod"
import { z } from "zod"

const User = z.object({ id: z.uuid(), name: z.string().min(3) })
const user = fixture(User, { name: "Ada" }, { seed: 42 })
const users = fixture.many(User, 3, undefined, { seed: 42 })

if (user.name !== "Ada" || users.length !== 3) {
  throw new Error("Packed package consumer assertion failed.")
}
`,
  )

  run(
    "corepack",
    [
      "pnpm",
      "install",
      "--offline",
      "--ignore-scripts",
      "--store-dir",
      storeDirectory,
    ],
    consumerDirectory,
  )
  run("corepack", ["pnpm", "exec", "tsc"], consumerDirectory)
  run(
    process.execPath,
    [join(consumerDirectory, "dist", "index.js")],
    consumerDirectory,
  )
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true })
}

function run(command, arguments_, cwd) {
  execFileSync(command, arguments_, {
    cwd,
    env: { ...process.env, CI: "true" },
    stdio: "inherit",
  })
}

function assertTarballExcludesBuildMetadata(tarball) {
  const listing = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
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
    execFileSync("tar", ["-xOf", tarball, packageJsonEntry], {
      encoding: "utf8",
    }),
  )
  if (packageJson.license !== "MIT") {
    throw new Error(`Missing MIT license metadata in ${tarball}.`)
  }
}
