# Changelog

All notable changes to the `d5-mermaid` package are documented in this file.

## 0.5.0

- Add `attachDomainToggle`, `attachSubdomainToggle`, `attachContextToggle`,
  `attachAggregateToggle` — a checklist overlay that hides/shows components in an
  already-rendered diagram, re-laying-out the rest rather than just fading them in place.
  The toggle unit is the same rule in every view: the individual boxes *inside* a
  container, never the container itself — a `Domain`/`Subdomain` stays even with every box
  inside it unchecked.
  | Diagram | Toggle unit | Also removed when hidden |
  |---|---|---|
  | `d5-domain` | `Subdomain` | any `Rel` touching it (its `Domain` always stays) |
  | `d5-subdomain` | `BoundedContext` | any `Rel` touching it (its `Subdomain` always stays) |
  | `d5-context` | `Aggregate` | any `Rel`/`Event`/`Policy` touching it (`Term`s, `ReadModel`s, the `BoundedContext` always stay) |
  | `d5-aggregate` | `Entity` / `ValueObject` | nothing else — this view has no `Rel`; `Invariants` are always shown as declared |
  - Items are grouped under a heading once there's more than one group to distinguish (a
    `Subdomain`'s heading names its `Domain`, a `BoundedContext`'s names its `Subdomain`,
    `d5-aggregate` groups by kind); a single group renders flat instead. Each group heading
    is itself a tri-state "select all" checkbox for that group.
  - The checklist panel is collapsible (click its heading) independent of what's shown in
    the diagram.
  - Needs the parsed db directly, not just an SVG string — `mermaid.render()` never hands
    that back. Also newly exported for this: `D5DomainDb`/`parseDomain`,
    `D5SubdomainDb`/`parseSubdomain`, `D5ContextDb`/`parseContext`,
    `D5AggregateDb`/`parseAggregate`.
- Fix: `attachPanZoom` composed with an `attach<Type>Toggle` on the same container (exactly
  what the example pages do) swallowed clicks on the toggle checklist — its pointerdown
  guard only recognised its own `+`/`−`/fit controls, not another helper's overlay UI
  sharing the container. Fixed with a shared `data-d5-overlay` marker any `attach*()`
  helper's UI can carry, also exported as `markOverlay`/`isOverlayEvent`/`OVERLAY_ATTR` for
  custom overlays of your own.
- Fix: `dagre.layout()` on a graph with zero nodes reports `width`/`height` as `-Infinity`,
  not `0` — the near-universal `graph().width || 0` fallback doesn't catch it because
  `-Infinity` is truthy in JS. Hiding every item in a container (now a normal thing to do
  with the checklist above) hit this in `d5-domain`, `d5-subdomain`, and `d5-context` alike;
  it also turned out to be a **pre-existing** bug for any `d5-context` diagram with only
  `Language` terms and no `Aggregate`s. Fixed everywhere with one shared helper.

## 0.4.0

- `d5-domain` accepts more than one top-level `Domain(...) { ... }` block on one canvas —
  e.g. two largely-separate businesses that share a strategic dependency. Each domain is
  laid out independently (its own Dagre graph, reusing the existing single-domain
  header/padding sizing) and the boxes stack top-to-bottom in declaration order; a `Rel`
  may cross between two different domains, drawn as a straight line clipped to each
  subdomain's box and dashed when it points at an earlier domain in the stack (the same
  "reverse dependency" convention as the 0.3.2 back-edge fix). See
  [D5-SPEC.md](../D5-SPEC.md) v0.4.0.
- Add `attachPanZoom(svg, container?, options?)` — bolts wheel-to-zoom (toward the
  cursor), drag-to-pan, double-click-to-zoom, and an optional +/−/fit control cluster onto
  an already-rendered SVG (mermaid itself only produces static SVG). Dependency-free by
  design: a `svg-pan-zoom`-style library sizes itself from the SVG's own `width`/`height`
  *attributes*, and mermaid emits `width="100%"` there for responsive embedding, which such
  libraries can't turn into a usable pixel size.
  - Fixes two bugs caught hand-testing it in a browser before release: the pan-start
    handler unconditionally captured the pointer on every pointerdown, which retargets the
    browser's synthesized `click` event away from whatever the pointerdown started on — the
    control buttons did nothing because their `click` never actually reached them. And
    `fit()` silently no-oped when called synchronously right after inserting the SVG (the
    natural call shape) because the container hadn't had its first layout pass yet; it now
    retries once via `requestAnimationFrame`.
  - `examples/one.html` and `examples/gallery.html` now use this instead of each carrying
    their own copy.

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
