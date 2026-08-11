# Architecture decision records

Architecture decision records capture choices that affect multiple packages or
public behavior. Status values are Proposed, Accepted, Superseded, or Rejected.

Before implementation begins, the records in this directory are considered
accepted planning decisions. If implementation evidence requires a change, add a
new record that supersedes the old one rather than rewriting history after the
first commit relying on it.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-immediate-fixture-api.md) | Use an immediate function API in v0.1 | Accepted |
| [0002](0002-core-ir-and-package-boundaries.md) | Isolate adapters and providers behind core IR | Accepted |
| [0003](0003-path-derived-randomness.md) | Derive random streams from seed and logical path | Accepted |
| [0004](0004-conservative-schema-semantics.md) | Use conservative values and explicit unsupported errors | Accepted |
