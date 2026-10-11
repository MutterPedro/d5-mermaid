# Changelog

All notable changes to the `d5-mermaid` package are documented in this file.

## 0.6.0

Implements [D5-SPEC.md](../D5-SPEC.md) v0.5.0 — the amendment to the two tactical views. Additive: a diagram that uses none of the new elements parses and renders byte-for-byte as before.

- `d5-context` is no longer limited to aggregates, and shows what crosses the context's boundary.
  - `DomainService(id, "Label")` — a stateless domain computation or decision that belongs to no single aggregate (stadium-shaped node). `Process(id, "Label")` — a long-running, stateful workflow (box with double side bars). Either can be an endpoint of a `Rel`/`Event`/`Command`/`Policy`.
  - `Command(source, target, "Name")` — a solid blue arrow with an Event Storming command tag; the counterpart of `Event`.
  - `Actor(id, "Label")` and a bodiless `BoundedContext(id, "Label")`, declared outside the subject's `{ ... }` block, are drawn outside the boundary, so an `Event` or `Command` to or from one visibly crosses it. The subject is the `BoundedContext` with a body; a diagram whose only `BoundedContext` has no body still gets it as the subject.
- `d5-aggregate` shows the aggregate's shape and behaviour, not just its members.
  - `Has(owner, part, multiplicity, as: "role")` — ownership inside the boundary. `multiplicity` is a keyword — `one` (default) / `optional` / `many` / `at_least_one` — not a string. With a `Has` or `Ref` present, the objects are laid out as a tree from the root instead of a grid, each `Has` a line with a composition diamond at the owner, labelled `1..* items`. A member no `Has` names as a part is ranked directly under the root with no line.
  - `Ref(source, aggregate, multiplicity, as: "role")` — a reference by identity to another aggregate, a dashed arrow. The target is a bodiless `Aggregate(...)` declared outside the subject's block and is drawn outside the boundary.
  - `Command(id, "Label")`, `Event(id, "Label")`, `Emits(command, event)` — a "Behaviour" band inside the boundary listing each command with the events it emits; events no command emits are listed on their own.
  - `Lifecycle { State(id, "Label") … Transition(from, to, on: command) … }` — a "Lifecycle" band with a small state diagram: the first state marked initial, a state nothing leaves marked terminal, each transition labelled with the `Command` its `on:` names.
  - A `Has`/`Ref`/`Transition` naming an undeclared id is dropped rather than drawn to nowhere.
- Toggles follow suit. `attachContextToggle` lists `DomainService`s and `Process`es beside `Aggregate`s, grouped by kind; an `Actor` or neighbouring context is hidden once every edge it had is gone. `attachAggregateToggle` drops any `Has`/`Ref` touching a hidden member, and a referenced aggregate once nothing references it.
  - **Changed:** `contextToggleAdapter.items()` now sets `group` on every item (`"Aggregates"`, …). The built-in checklist still renders flat when a context has only Aggregates; a custom UI reading `group` will see it where it was `undefined`.
- `D5ContextReadable` and `D5AggregateReadable` gain getters for the above (`getDomainServices`, `getProcesses`, `getNeighbours`, `getActors`, `getCommands`; `getHas`, `getRefs`, `getNeighbours`, `getCommands`, `getEvents`, `getEmits`, `getStates`, `getTransitions`). **Changed:** a hand-written object passed where one of these interfaces is expected (a custom `ToggleAdapter.filter`, say) must now supply them.
- Layout: a referenced aggregate is ranked above the member that references it, so it lands beside (or above) the boundary and the `Ref` line never runs down through the Behaviour / Lifecycle / Invariants bands. In `d5-context`, once anything sits outside the boundary the Language sidebar is laid out as a node of the context rather than appended to its right, so an edge to an outside node is routed around it instead of across it. (A context with nothing outside keeps the sidebar where it was.)
- Examples: nine models now use the new elements — eShop (Ordering context, Order aggregate), dddsample (Booking context with its Routing Service, Cargo aggregate), library (Lending context, Patron and Book aggregates) and all-things-cqrs (Credit Card context and aggregate).
- `examples/gallery.html` is navigable:
  - A sticky sidebar lists every example, marks the one being read as the page scrolls, and dots the ones that use the newest elements.
  - Filter by view (Domain / Subdomain / Context / Aggregate), by element used (`Has`, `Lifecycle`, `Command`, … — read off each diagram's parsed db, so a tag can't drift from its source), and by free-text search over titles, notes and D5 source. Each card shows its elements as tags; clicking one filters by it. Filters live in the query string, so a filtered view can be linked.
  - <kbd>/</kbd> focuses search, <kbd>j</kbd> / <kbd>k</kbd> step through the visible diagrams, each card has a permalink, an "Expand" toggle and an "Open alone" link to `one.html`.
  - Diagrams render as they approach the viewport instead of all forty up front, the checklist starts collapsed, and the wheel scrolls the page unless ctrl/⌘ is held — previously a pointer resting on a diagram zoomed it instead of scrolling.
- Add `attachExport(svg, container?, options?)` — a "PNG" button (top-right of the container, clear of the pan/zoom controls and the toggle checklist) that downloads the rendered diagram as a high-resolution PNG, 4× its natural size by default so it holds up when zoomed into. Also exported without the button as `exportPng(svg, options)` (resolves with the `Blob`) and `downloadPng(svg, options)`.
  - Always exports the whole diagram at rest — the live view's pan/zoom transform is stripped from the copy that gets rasterized — with a small margin and an opaque white background by default (`background: "transparent"` for none). What's drawn is what's exported: components unchecked in an `attach<Type>Toggle` checklist are left out too.
  - Styles the browser resolved from the host page's CSS (fill, stroke, font, ...) are baked into the copy first, since an SVG loaded as an image can't see the page's stylesheets. The result goes through a `data:` URL rather than a `blob:` one, which Safari treats as tainting the canvas.
  - `scale` is capped so the PNG stays within what browsers can actually encode (`maxDimension`, default 16384 px on the longest side; `maxPixels`, default 8192²) instead of failing outright on a very large diagram. Options: `scale`, `background`, `padding`, `filename` (defaults to the diagram's title, slugified), `label`, `onExport`, `onError`.
  - `examples/gallery.html` and `examples/one.html` now show the button.

## 0.5.0

- Add `attachDomainToggle`, `attachSubdomainToggle`, `attachContextToggle`, `attachAggregateToggle` — a checklist overlay that hides/shows components in an already-rendered diagram, re-laying-out the rest rather than just fading them in place. The toggle unit is the same rule in every view: the individual boxes *inside* a container, never the container itself. A `Domain`/`Subdomain` isn't a toggle unit, but once every box inside it is unchecked it's hidden along with them rather than left behind as an empty box (and comes back as soon as one is re-checked); one *authored* with no boxes at all still renders as declared.

  | Diagram | Toggle unit | Also removed when hidden |
  | --- | --- | --- |
  | `d5-domain` | `Subdomain` | any `Rel` touching it; its `Domain` once all of that Domain's `Subdomain`s are hidden |
  | `d5-subdomain` | `BoundedContext` | any `Rel` touching it; its `Subdomain` once all of that Subdomain's `BoundedContext`s are hidden |
  | `d5-context` | `Aggregate` | any `Rel`/`Event`/`Policy` touching it (`Term`s, `ReadModel`s, the `BoundedContext` always stay) |
  | `d5-aggregate` | `Entity` / `ValueObject` | nothing else — this view has no `Rel`; `Invariants` are always shown as declared |

  - Items are grouped under a heading once there's more than one group to distinguish (a `Subdomain`'s heading names its `Domain`, a `BoundedContext`'s names its `Subdomain`, `d5-aggregate` groups by kind); a single group renders flat instead. Each group heading is itself a tri-state "select all" checkbox for that group.
  - The checklist panel is collapsible (click its heading) independent of what's shown in the diagram.
  - Needs the parsed db directly, not just an SVG string — `mermaid.render()` never hands that back. Also newly exported for this: `D5DomainDb`/`parseDomain`, `D5SubdomainDb`/`parseSubdomain`, `D5ContextDb`/`parseContext`, `D5AggregateDb`/`parseAggregate`.
- Fix: `attachPanZoom` composed with an `attach<Type>Toggle` on the same container (exactly what the example pages do) swallowed clicks on the toggle checklist — its pointerdown guard only recognised its own `+`/`−`/fit controls, not another helper's overlay UI sharing the container. Fixed with a shared `data-d5-overlay` marker any `attach*()` helper's UI can carry, also exported as `markOverlay`/`isOverlayEvent`/`OVERLAY_ATTR` for custom overlays of your own.
- Fix: `dagre.layout()` on a graph with zero nodes reports `width`/`height` as `-Infinity`, not `0` — the near-universal `graph().width || 0` fallback doesn't catch it because `-Infinity` is truthy in JS. Hiding every item in a container (now a normal thing to do with the checklist above) hit this in `d5-domain`, `d5-subdomain`, and `d5-context` alike; it also turned out to be a **pre-existing** bug for any `d5-context` diagram with only `Language` terms and no `Aggregate`s. Fixed everywhere with one shared helper.
- Fix: unchecking every `BoundedContext` of one `Subdomain` in `d5-subdomain` drew a stray rect pinned at the SVG's origin — "a component not properly cleaned up, rendering a flat rectangle". A compound cluster (a `Subdomain`) with zero children gets `x`/`y` from Dagre but no `width`/`height` at all (`undefined`, not `0`); `undefined / 2` is `NaN`, which then poisoned the box's position too. Falls back to a box sized like one typical `BoundedContext` so the empty `Subdomain` still reads. (A toggled-empty `Subdomain` is now hidden instead — see above — so this path is only reached by a `Subdomain` authored with no `BoundedContext`s.)
- Fix: that fallback size wasn't enough on its own — emptying *two or more* `Subdomain`s at once rendered them stacked on top of each other, spilling out of a `viewBox` far smaller than the boxes actually drawn into it. Dagre reserves no layout space for an empty cluster either, not just no size, so a nonzero fallback box drawn on top of that zero-reserved spacing overlapped its neighbor. Fixed at the source: every empty `Subdomain` now gets an invisible placeholder child, sized like a real `BoundedContext`, added to the graph *before* `dagre.layout()` runs, so Dagre reserves real space for it from the start.
- Fix: a direct two-way relationship between two `Subdomain`s in different `Domain`s (`Rel(a, b, ...)` and `Rel(b, a, ...)`) in `d5-domain` clipped to the same two points regardless of direction, so it drew as one line traced twice with both edge labels stacked on the same spot. Cross-domain `Rel`s sharing a pair now bow apart via a curved control point instead.
- Fix: the `d5-domain` type legend draws at a fixed width regardless of the diagram's own content width, so once every `Subdomain` is toggled off and every `Domain` shrinks to its empty/fallback size, the legend could spill past the `viewBox` — seen as a stray mark and clipped "Generic" label past the diagram's edge. The `viewBox` width is now sized against the legend's own required width too, not just the `Domain` boxes.

## 0.4.0

- `d5-domain` accepts more than one top-level `Domain(...) { ... }` block on one canvas — e.g. two largely-separate businesses that share a strategic dependency. Each domain is laid out independently (its own Dagre graph, reusing the existing single-domain header/padding sizing) and the boxes stack top-to-bottom in declaration order; a `Rel` may cross between two different domains, drawn as a straight line clipped to each subdomain's box and dashed when it points at an earlier domain in the stack (the same "reverse dependency" convention as the 0.3.2 back-edge fix). See [D5-SPEC.md](../D5-SPEC.md) v0.4.0.
- Add `attachPanZoom(svg, container?, options?)` — bolts wheel-to-zoom (toward the cursor), drag-to-pan, double-click-to-zoom, and an optional +/−/fit control cluster onto an already-rendered SVG (mermaid itself only produces static SVG). Dependency-free by design: a `svg-pan-zoom`-style library sizes itself from the SVG's own `width`/`height` *attributes*, and mermaid emits `width="100%"` there for responsive embedding, which such libraries can't turn into a usable pixel size.
  - Fixes two bugs caught hand-testing it in a browser before release: the pan-start handler unconditionally captured the pointer on every pointerdown, which retargets the browser's synthesized `click` event away from whatever the pointerdown started on — the control buttons did nothing because their `click` never actually reached them. And `fit()` silently no-oped when called synchronously right after inserting the SVG (the natural call shape) because the container hadn't had its first layout pass yet; it now retries once via `requestAnimationFrame`.
  - `examples/one.html` and `examples/gallery.html` now use this instead of each carrying their own copy.

## 0.3.2

- Fix: `d5-domain`'s "back edge" detection (the dashed line marking a relationship that runs against the dominant flow, i.e. a likely dependency cycle) compared the wrong layout axis for any `direction` other than the default `TB`/`BT`. For `LR`/`RL` diagrams it produced false-positive dashed edges even when the subdomain graph had no cycle. Detection is now direction-aware, verified against `direction TB`, `BT`, `LR` and `RL`.
- Add a hover tooltip and a "Reverse dependency (cycle)" legend entry on `d5-domain` back edges (shown only when the diagram contains one), matching the relationship-pattern legend already used in `d5-subdomain`.

## 0.3.1

- Test release verifying the npm Trusted Publishing (OIDC) staged-publish pipeline. No code changes.

## 0.3.0

See [D5-SPEC.md](../D5-SPEC.md) changelog — this release implements the `direction` line, `Invariants`, the context-map relationship pattern encoding, and `Event` / `Policy` / `ReadModel` in `d5-context`.

## 0.2.0

Document the optional `fields:` attribute on `Aggregate` in the `d5-context` Mermaid syntax (already supported by the reference implementation).

## 0.1.0

Initial release: `d5-domain`, `d5-subdomain`, `d5-context`, `d5-aggregate` diagram types.
