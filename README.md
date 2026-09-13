# d5-mermaid

A [Mermaid.js](https://mermaid.js.org/) extension for **D5 (Domain Driven Design Definitive Diagrams)** — visualize DDD strategic and tactical patterns as diagrams.

D5 provides four diagram types at progressive zoom levels, inspired by the C4 model but focused on the domain model rather than technical architecture. This package implements the [D5 specification](https://github.com/MutterPedro/d5-spec) as custom Mermaid diagram types.

## Diagram Types

| Diagram | Keyword | What it shows |
|---|---|---|
| **Domain** | `d5-domain` | Strategic overview: subdomains and their relationships |
| **Subdomain** | `d5-subdomain` | Context map: bounded contexts and DDD relationship patterns |
| **Context** | `d5-context` | Tactical structure: aggregates, ubiquitous language, domain events, policies and read models within a bounded context |
| **Aggregate** | `d5-aggregate` | Domain objects: entities, value objects and invariants within an aggregate |

## Installation

```bash
npm install d5-mermaid mermaid
```

## Usage

```typescript
import mermaid from 'mermaid';
import { d5Diagrams } from 'd5-mermaid';

mermaid.initialize({ startOnLoad: false });
await mermaid.registerExternalDiagrams(d5Diagrams);

const { svg } = await mermaid.render('my-diagram', `d5-domain
  title ACME Retail Platform

  Domain(acme, "ACME Retail") {
    Subdomain(catalog, "Product Catalog", core)
    Subdomain(ordering, "Order Management", core)
    Subdomain(inventory, "Inventory", supporting)
    Subdomain(payments, "Payments", generic)
  }

  Rel(ordering, catalog, "depends on")
  Rel(ordering, payments, "depends on")
`);
```

## Syntax Reference

### Common

- `title <text>` — optional, first line after the diagram keyword.
- `direction <LR|RL|TB|TD|BT>` — optional layout hint. Default `LR` for `d5-subdomain`, `TB` for `d5-domain` and `d5-context`.
- `%%` — line and inline comments.

### d5-domain

Strategic overview of the business domain. Subdomain types: `core`, `supporting`, `generic`.

```
d5-domain
  title ACME Retail Platform
  direction LR

  Domain(acme, "ACME Retail") {
    Subdomain(catalog, "Product Catalog", core)
    Subdomain(ordering, "Order Management", core)
    Subdomain(inventory, "Inventory", supporting)
    Subdomain(payments, "Payments", generic)
  }

  Rel(ordering, catalog, "depends on")
  Rel(ordering, payments, "depends on")
```

A diagram may declare **more than one `Domain(...)` block** — each is laid out
independently and stacked top-to-bottom in declaration order, so two largely-separate
businesses can share one canvas. A `Rel` may cross between two different `Domain` blocks;
one that points back at an earlier domain in the stack is drawn dashed, the same way a
same-domain relationship that runs against the layout's flow is:

```
d5-domain
  title Mobility & Delivery

  Domain(mobility, "Mobility") {
    Subdomain(ride_matching, "Ride Matching", core)
    Subdomain(driver_identity, "Driver Identity & Payouts", generic)
  }

  Domain(delivery, "Delivery") {
    Subdomain(courier_dispatch, "Courier Dispatch", core)
  }

  Rel(courier_dispatch, driver_identity, "authenticates & pays couriers via")
```

### d5-subdomain

Context map: bounded contexts within subdomains and the DDD relationship pattern between
each pair. `source` is the upstream context, `target` the downstream one.

```
d5-subdomain
  title Context Map
  direction LR

  Subdomain(catalog, "Product Catalog", core) {
    BoundedContext(product_ctx, "Product Context", team: "Catalog Team")
    BoundedContext(pricing_ctx, "Pricing Context")
  }

  Subdomain(ordering, "Order Management", core) {
    BoundedContext(order_ctx, "Order Context", team: "Order Squad")
  }

  Subdomain(identity, "Identity", generic) {
    BoundedContext(auth_ctx, "Auth Context")
  }

  Rel(pricing_ctx, product_ctx, "Partnership")
  Rel(order_ctx, pricing_ctx, "Conformist")
  Rel(auth_ctx, order_ctx, "Open Host Service")
```

A relationship label that matches one of Evans' context-map patterns is drawn as a compact
badge with `U`/`D` (or `S`/`C`) role markers and pattern-specific decoration — an
Anti-Corruption Layer gate, an Open Host Service socket, no-arrowhead lines for
Partnership / Shared Kernel, a dashed line for Separate Ways — plus a legend of the
patterns used. Matching is case-, spacing- and abbreviation-insensitive:

| Pattern | Accepted labels |
|---|---|
| Partnership | `Partnership`, `P` |
| Shared Kernel | `Shared Kernel`, `SK` |
| Customer-Supplier | `Customer-Supplier`, `Customer/Supplier`, `CS` |
| Conformist | `Conformist`, `CF` |
| Anti-Corruption Layer | `Anti-Corruption Layer`, `AntiCorruption`, `ACL` |
| Open Host Service | `Open Host Service`, `OHS` |
| Published Language | `Published Language`, `PL` |
| Separate Ways | `Separate Ways`, `SW` |
| Big Ball of Mud | `Big Ball of Mud`, `BBoM` |

Any other label renders as a plain text pill.

### d5-context

Tactical structure within a single bounded context.

```
d5-context
  title Ordering Context
  direction LR

  BoundedContext(order_ctx, "Ordering", team: "Order Squad") {

    Language {
      Term("Order", "A confirmed purchase request with one or more line items")
      Term("Order Item", "A product line: product id, unit price captured at order time, quantity")
    }

    Aggregate(order_agg, "Order", root: "Order", fields: "Buyer, Order Items, Total, Status")
    Aggregate(buyer_agg, "Buyer", root: "Buyer", fields: "Identity GUID, Payment Methods")

    ReadModel(order_view, "My Orders / Order Detail")

    Rel(order_agg, buyer_agg, "references the buyer & payment method by id")

    Event(order_agg, buyer_agg, "OrderStarted")
    Event(order_agg, order_view, "OrderStatusChanged")

    Policy(order_agg, order_agg, "when stock is confirmed for every item, advance the order and request payment")
  }
```

- **`Aggregate(id, "Label", root: "Name")`** — `root:` required; optional `fields:` is a
  comma-separated shorthand for the aggregate's shape.
- **`Language { Term("Name", "Definition") }`** — the ubiquitous language, drawn as a sidebar.
- **`ReadModel(id, "Label")`** — a CQRS query-side projection; drawn as a table-shaped node,
  fed by `Event(...)` edges whose `target` is the read model.
- **`Rel(source, target, "label")`** — a structural by-id reference between aggregates.
- **`Event(source, target, "EventName")`** — a domain event: `source` emits, `target` reacts.
  Drawn as a dashed amber arrow with an Event Storming tag. Multiple per pair allowed.
- **`Policy(source, target, "whenever … then …")`** — a reactive policy. Drawn as a dashed
  violet arrow; `source === target` for a scheduled / self-directed policy.

### d5-aggregate

Internal composition of a single aggregate. No `Rel` — containment implies direct references.

```
d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(order_item, "Order Item")
    ValueObject(money, "Money")
    ValueObject(quantity, "Quantity")
    ValueObject(shipping_address, "Shipping Address")

    Invariants {
      Invariant("An order always has at least one order item")
      Invariant("Status", "Only advances Placed → Paid → Shipped → Delivered")
    }
  }
```

The optional **`Invariants { Invariant("rule") | Invariant("Subject", "rule") }`** block
lists the business rules the aggregate keeps true on every transaction. It renders as a
band inside the aggregate boundary, attributed to the root.

## Pan & Zoom

Mermaid only renders static SVG — navigating a large diagram is left to whatever embeds it.
`attachPanZoom` bolts that on: wheel to zoom (toward the cursor), drag to pan, double-click
to zoom in, plus an optional +/−/fit button cluster. It's dependency-free (no `svg-pan-zoom`
or similar — see the source comment in `src/shared/pan-zoom.ts` for why: that class of
library sizes itself from the SVG's own `width`/`height` *attributes*, and mermaid emits
`width="100%"` there for responsive embedding, which they can't turn into a usable pixel size).

```typescript
import { attachPanZoom } from 'd5-mermaid';

const { svg } = await mermaid.render('my-diagram', src);
container.innerHTML = svg;
attachPanZoom(container.querySelector('svg'), container);
```

`container` (default: the svg's own parent) is given `overflow: hidden`, `position:
relative` (if it was `static`) and a grab cursor, and is where the controls/hint are
anchored. It returns a handle — `{ fit(), zoomIn(), zoomOut(), getScale(), destroy() }` —
and takes an options object: `minScale` / `maxScale` (default `0.05` / `20`), `wheelStep`
(`1.15`), `dblClickStep` (`1.6`), `fitPadding` (`0.94`), `controls` (`true`), and `hint`
(`true`; a string overrides the default text, `false` hides it).

## Toggling Components

Each diagram type has an `attach<Type>Toggle` that draws a checklist over the diagram —
unchecking an item hides it (and anything that only referenced it) and re-lays-out the
rest, rather than just fading it in place. The rule is the same in every view: toggle the
individual boxes *inside* a container, never the container itself — a `Domain`/`Subdomain`
stays even with every box inside it unchecked:

| Diagram | Toggle unit | Also removed when hidden |
|---|---|---|
| `d5-domain` | `Subdomain` | any `Rel` touching it (its `Domain` always stays) |
| `d5-subdomain` | `BoundedContext` | any `Rel` touching it (its `Subdomain` always stays) |
| `d5-context` | `Aggregate` | any `Rel`/`Event`/`Policy` touching it (`Term`s, `ReadModel`s, and the `BoundedContext` are always shown) |
| `d5-aggregate` | `Entity` / `ValueObject` | nothing else — this view has no `Rel`; `Invariants` are free text and always shown as declared |

The checklist groups items under a heading once there's more than one group to distinguish
— a `Subdomain`'s heading names its `Domain`, a `BoundedContext`'s names its `Subdomain`,
and `d5-aggregate` groups by kind ("Entities" / "Value Objects"). A single group (e.g. one
`Domain`, or an aggregate with no Value Objects) renders as a flat list instead — a heading
naming the one thing everything already belongs to wouldn't add anything. `d5-context` has
no natural sub-grouping for Aggregates, so it's always flat. Click the panel's heading to
collapse/expand the checklist without affecting what's shown in the diagram.

Unlike `attachPanZoom` (a pure post-render transform), toggling changes the actual layout,
so it needs the parsed data — not just an SVG string, which is all `mermaid.render()` hands
back. Parse with this package's own `parse<Type>` directly instead; the toggle helper
performs the first render too, so that's the only step before attaching it:

```typescript
import { D5DomainDb, parseDomain, attachDomainToggle } from 'd5-mermaid';

const db = new D5DomainDb();
parseDomain(src, db);

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
container.appendChild(svg);
attachDomainToggle(svg, db, container);
```

The other three follow the same shape: `D5SubdomainDb`/`parseSubdomain`/`attachSubdomainToggle`,
`D5ContextDb`/`parseContext`/`attachContextToggle`, `D5AggregateDb`/`parseAggregate`/`attachAggregateToggle`.
Each returns a handle — `{ show(id), hide(id), toggle(id), isVisible(id), getHiddenIds(), destroy() }`
— and takes an options object: `panel` (`true`; draws the checklist), `panelTitle`
(`"Show"`), `collapsed` (`false`; start the checklist collapsed), `initiallyHidden` (an
iterable of ids to start unchecked), and `onChange` (called with the current visible-id set
after every re-render — handy for calling an `attachPanZoom` instance's `.fit()` on the
same svg, since hiding things changes the diagram's size).

`attachPanZoom` and an `attach<Type>Toggle` can be pointed at the same container (see
`examples/one.html?toggle=1`) — mark any overlay UI you add there yourself with
`markOverlay` so `attachPanZoom`'s drag handling skips it too, the same way its own
controls and the toggle checklist do.

## Examples

`examples/` contains D5 models of seven real-world DDD codebases and techniques
(dddsample-core, ddd-by-examples/library, IDDD_Samples, eShopOnContainers, Wolff
Microservices, a Nick-Tune-style Core Domain Chart, all-things-cqrs) — 39 diagrams across
every zoom level — plus a `d5-domain` model of Uber's Mobility & Delivery segments
demonstrating multiple `Domain` blocks on one canvas.

```bash
npm run gallery   # builds and opens examples/gallery.html
```

## Development

```bash
npm install
npm test            # run tests (vitest + jsdom)
npm run test:watch  # watch mode
npm run build       # build for distribution (tsup: ESM + CJS + types)
npm run lint        # type-check (tsc --noEmit)
```

## License

[MIT](LICENSE)
