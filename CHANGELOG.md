# Changelog

All notable changes to the `d5-mermaid` package are documented in this file.

## 0.3.2

- Fix: `d5-domain`'s "back edge" detection (the dashed line marking a relationship that
  runs against the dominant flow, i.e. a likely dependency cycle) compared the wrong
  layout axis for any `direction` other than the default `TB`/`BT`. For `LR`/`RL` diagrams
  it produced false-positive dashed edges even when the subdomain graph had no cycle.
  Detection is now direction-aware, verified against `direction TB`, `BT`, `LR` and `RL`.
- Add a hover tooltip and a "Reverse dependency (cycle)" legend entry on `d5-domain` back
  edges (shown only when the diagram contains one), matching the relationship-pattern
  legend already used in `d5-subdomain`.

## 0.3.1

- Test release verifying the npm Trusted Publishing (OIDC) staged-publish pipeline. No
  code changes.

## 0.3.0

See [D5-SPEC.md](../D5-SPEC.md) changelog — this release implements the `direction` line,
`Invariants`, the context-map relationship pattern encoding, and `Event` / `Policy` /
`ReadModel` in `d5-context`.

## 0.2.0

Document the optional `fields:` attribute on `Aggregate` in the `d5-context` Mermaid
syntax (already supported by the reference implementation).

## 0.1.0

Initial release: `d5-domain`, `d5-subdomain`, `d5-context`, `d5-aggregate` diagram types.
