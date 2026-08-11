import { Faker, en, generateMersenne53Randomizer } from "@faker-js/faker"
import type { PrimitiveProvider, ProviderContext } from "@fixturesmith/core"

export class FakerProvider implements PrimitiveProvider {
  email(context: ProviderContext): string {
    return createFaker(context).internet.email()
  }

  string(context: ProviderContext): string {
    return createFaker(context).word.sample()
  }

  url(context: ProviderContext): string {
    return createFaker(context).internet.url()
  }

  uuid(context: ProviderContext): string {
    return createFaker(context).string.uuid()
  }
}

function createFaker(context: ProviderContext): Faker {
  const randomizer = generateMersenne53Randomizer()
  randomizer.seed(context.random.uint32())

  return new Faker({
    locale: [en],
    randomizer,
  })
}
