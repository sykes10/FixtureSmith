import type { PrimitiveProvider } from "@fixturesmith/core"
import { fixture } from "@fixturesmith/zod"
import { z } from "zod"

const provider: PrimitiveProvider = {
  string: ({ random }) => `value-${random.uint32()}`,
  email: ({ random }) => `user-${random.uint32()}@example.test`,
  url: ({ random }) => `https://example.test/${random.uint32()}`,
  uuid: ({ random }) => {
    const value = random.uint32().toString(16).padStart(8, "0")
    return `${value}-0000-4000-8000-000000000000`
  },
}

const Example = z.object({ id: z.uuid(), email: z.email() })
const value = fixture(Example, { provider, seed: 42 })

console.log(value)
