# Errors and diagnostics

## Goals

Fixture failures must identify what failed, where it failed, and what the user can
do next. Errors are part of the public API and should be testable without matching
entire prose messages.

## Base error

```ts
abstract class FixtureError extends Error {
  abstract readonly code: string
  readonly path: readonly (string | number)[]
  readonly seed?: NormalizedSeed
  readonly cause?: unknown
}
```

Use stable machine-readable codes and structured properties. Human-readable
messages can improve without being a breaking change.

## Error categories

### UnsupportedSchemaError

The Zod adapter encountered a node or check outside the compatibility matrix.

Required fields:

- `code: "UNSUPPORTED_SCHEMA"`
- source schema kind or check
- complete schema path
- remediation hint

Example:

```text
FixtureSmith cannot generate ZodEffects at $.profile.slug.
Provide a supported schema or override the containing field.
```

An override may short-circuit an unsupported child only if normalization is
designed to preserve enough shape to do so safely. The initial implementation
should normalize first and therefore reject unsupported nodes consistently.

### InvalidSchemaConstraintError

Supported checks combine into an impossible or unrepresentable range.

Examples:

- string minimum length exceeds maximum length,
- integer interval contains no integer,
- array exact length conflicts with maximum,
- semantic format cannot satisfy a compatible length bound.

Required fields include normalized constraints and path.

### InvalidFixtureOptionsError

Public options are malformed, including invalid seeds or collection counts.
These errors generally occur before schema walking and may have an empty path.

### FixtureValidationError

The generated or overridden object failed the original Zod parse.

Required fields:

- root seed
- FixtureSmith path when determinable
- original Zod issues as structured data
- cause

The message should say whether an override callback was active at the failing
path when that information is known.

### ProviderError

A custom or default provider failed, returned an unusable value, or violated a
supported provider operation. Wrap the original cause and identify the provider
operation and field path.

Do not wrap programmer errors so aggressively that the original stack becomes
unavailable.

## Path formatting

Store paths as typed segments and format them only for messages:

```ts
[]                         // $
["profile", "name"]      // $.profile.name
["orders", 2, "total"]   // $.orders[2].total
["unusual-key"]           // $["unusual-key"] when dot notation is unsafe
```

Structured paths avoid ambiguity and enable tooling later.

## Seed reporting

Once a generation session exists, every thrown FixtureError includes its
normalized root seed. If the user supplied a string or numeric seed, retain a
safe display form of the original input as additional metadata when practical.

Never hide the reproduction seed solely inside a formatted message.

## Message style

Messages should follow:

```text
<what FixtureSmith could not do> at <path>.
<relevant constraint or source kind>.
<one concrete remediation>.
Seed: <seed>.
```

Avoid documentation URLs until stable published URLs exist. Error codes and
structured fields are the durable diagnostic surface.
