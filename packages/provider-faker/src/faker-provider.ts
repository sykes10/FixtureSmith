import { Faker, en, generateMersenne53Randomizer } from "@faker-js/faker"
import type { PrimitiveProvider, ProviderContext } from "@fixturesmith/core"

export class FakerProvider implements PrimitiveProvider {
  string(context: ProviderContext): string {
    const randomizer = generateMersenne53Randomizer()
    randomizer.seed(context.random.uint32())

    const faker = new Faker({
      locale: [en],
      randomizer,
    })

    return faker.word.sample()
  }
}
