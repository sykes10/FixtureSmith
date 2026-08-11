# Engineering documentation

This directory converts the product intent in the PRD into contracts that can be
implemented and reviewed. When documents disagree, use this precedence:

1. The PRD controls product goals and release scope.
2. Accepted architecture decision records control deliberate technical choices.
3. The engineering specifications control v0.1 behavior.
4. The implementation plan controls sequencing, not behavior.

## Read before implementation

1. [Architecture](architecture.md) explains package ownership and the generation
   pipeline.
2. [Public API](public-api.md) defines call signatures, override behavior, and
   generation options.
3. [Determinism](determinism.md) defines the seed contract and random stream
   ownership.
4. [Schema support](schema-support.md) defines the Zod compatibility boundary.
5. [Errors](errors.md) defines failure categories and required diagnostics.
6. [Testing strategy](testing-strategy.md) defines evidence required for each
   feature.
7. [MVP implementation plan](implementation/mvp-plan.md) sequences the work into
   vertical milestones.
8. [Dependency policy](dependency-policy.md) defines how versions are selected
   and when compatibility exceptions are allowed.

## Decision records

The decisions directory contains choices that should not be changed casually:

- [ADR 0001: Immediate fixture API](decisions/0001-immediate-fixture-api.md)
- [ADR 0002: Core IR and package boundaries](decisions/0002-core-ir-and-package-boundaries.md)
- [ADR 0003: Path-derived deterministic randomness](decisions/0003-path-derived-randomness.md)
- [ADR 0004: Conservative schema semantics](decisions/0004-conservative-schema-semantics.md)

## Documentation rules

- Mark proposed behavior explicitly until tests implement it.
- Do not claim support for a Zod construct without a runtime validation test.
- Behavioral changes require updating the relevant specification and test in the
  same pull request.
- Cross-version output stability is not implied by a deterministic test fixture.
- New schema adapters must prove the core IR is suitable; do not generalize the
  IR speculatively.
