# d5-mermaid

A [Mermaid.js](https://mermaid.js.org/) extension for **D5 (Domain Driven Design Definitive Diagrams)** — visualize DDD strategic and tactical patterns as diagrams.

D5 provides four diagram types at progressive zoom levels, inspired by the C4 model but focused on the domain model rather than technical architecture. This package implements the [D5 specification](https://github.com/MutterPedro/d5-spec) as custom Mermaid diagram types.

## Diagram Types

| Diagram | Keyword | What it shows |
|---|---|---|
| **Domain** | `d5-domain` | Strategic overview: subdomains and their relationships |
| **Subdomain** | `d5-subdomain` | Context map: bounded contexts and DDD relationship patterns |
| **Context** | `d5-context` | Tactical structure: aggregates, domain services, processes and read models within a bounded context, the commands, events and policies between them, the actors and neighbouring contexts outside it, and its ubiquitous language |
| **Aggregate** | `d5-aggregate` | One aggregate: its entities and value objects and who owns what, the aggregates it references by id, the commands it handles and events it emits, its lifecycle and its invariants |

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

A context is not only aggregates, and it does not live alone. Everything declared outside the subject's `{ ... }` block is drawn outside its boundary:

```
d5-context
  title Ordering Context

  BoundedContext(order_ctx, "Ordering", team: "Order Squad") {
    Aggregate(order_agg, "Order", root: "Order")
    DomainService(pricing, "Order Pricing")
    Process(checkout, "Checkout")

    Command(customer, order_agg, "Place Order")
    Rel(order_agg, pricing, "priced by")
    Event(order_agg, checkout, "OrderPlaced")
    Event(checkout, payment_ctx, "PaymentRequested")
    Event(payment_ctx, checkout, "PaymentReceived")
    Command(checkout, order_agg, "Confirm Order")
  }

  Actor(customer, "Customer")
  BoundedContext(payment_ctx, "Payment")
```

- **`DomainService(id, "Label")`** — a stateless domain computation or decision that belongs to no single aggregate. Drawn as a stadium-shaped node.
- **`Process(id, "Label")`** — a long-running, stateful workflow (process manager / saga). Drawn as a box with double side bars.
- **`Command(source, target, "CommandName")`** — a request: `source` asks `target` to do it. Drawn as a solid blue arrow with an Event Storming command tag.
- **`Actor(id, "Label")`** — a person or role issuing commands. Declared outside the subject's block.
- **`BoundedContext(id, "Label")`** with no body, outside the subject's block — a neighbouring context. An `Event` or `Command` to or from it crosses the boundary line.

### d5-aggregate

A single aggregate. No `Rel` — containment implies direct references.

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

That is membership. To show the aggregate's shape and behaviour as well, state them:

```
d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(order_item, "Order Item")
    ValueObject(money, "Money")
    ValueObject(order_status, "Order Status")

    Has(order, order_item, at_least_one, as: "items")
    Has(order, order_status, as: "status")
    Has(order_item, money, as: "unit price")
    Ref(order_item, product_agg, as: "product")

    Command(place, "Place Order")
    Command(pay, "Pay Order")
    Event(placed, "OrderPlaced")
    Event(paid, "OrderPaid")
    Emits(place, placed)
    Emits(pay, paid)

    Lifecycle {
      State(s_placed, "Placed")
      State(s_paid, "Paid")
      Transition(s_placed, s_paid, on: pay)
    }
  }

  Aggregate(product_agg, "Product", root: "Product")
```

- **`Has(owner, part, multiplicity, as: "role")`** — ownership inside the boundary. `multiplicity` is `one` (default), `optional`, `many` or `at_least_one`; `as:` is optional. Once a diagram has a `Has` or a `Ref`, the objects are laid out as a tree from the root instead of a grid, each `Has` a line with a composition diamond at the owner. A member no `Has` names as a part sits directly under the root, with no line.
- **`Ref(source, aggregate, multiplicity, as: "role")`** — a reference by identity to another aggregate, drawn as a dashed arrow. The target is a bodiless `Aggregate(...)` declared outside the subject's block, and is drawn outside the boundary.
- **`Command(id, "Label")`**, **`Event(id, "Label")`**, **`Emits(command, event)`** — the commands the aggregate handles and the events handling each one emits, listed in a band inside the boundary. (In `d5-context` `Command` and `Event` take a source and a target instead: there they are edges.)
- **`Lifecycle { State(id, "Label") … Transition(from, to, on: command) … }`** — the aggregate's states as a small state diagram in its own band. The first state is the initial one, a state nothing leaves is terminal, and `on:` names the `Command` that causes the transition.

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

Each diagram type has an `attach<Type>Toggle` that draws a checklist over the diagram — unchecking an item hides it (and anything that only referenced it) and re-lays-out the rest, rather than just fading it in place. The toggle unit is the same rule in every view: the individual boxes *inside* a container, never the container itself. A `Domain`/`Subdomain` isn't a toggle unit, but once every box inside it is unchecked it's hidden along with them rather than left behind as an empty box — and comes back as soon as one is re-checked. A `Domain`/`Subdomain` *authored* with no boxes at all still renders as declared.

| Diagram | Toggle unit | Also removed when hidden |
|---|---|---|
| `d5-domain` | `Subdomain` | any `Rel` touching it; its `Domain` too, once every one of that Domain's Subdomains is hidden |
| `d5-subdomain` | `BoundedContext` | any `Rel` touching it; its `Subdomain` too, once every one of that Subdomain's Bounded Contexts is hidden |
| `d5-context` | `Aggregate` / `DomainService` / `Process` | any `Rel`/`Event`/`Command`/`Policy` touching it; an `Actor` or neighbouring context too, once every edge it had is gone (`Term`s, `ReadModel`s, and the subject `BoundedContext` are always shown — that boundary never goes empty) |
| `d5-aggregate` | `Entity` / `ValueObject` | any `Has`/`Ref` touching it; a referenced aggregate too, once every `Ref` to it is gone (`Invariants`, the `Lifecycle` and the commands/events are always shown as declared) |

The checklist groups items under a heading once there's more than one group to distinguish — a `Subdomain`'s heading names its `Domain`, a `BoundedContext`'s names its `Subdomain`, and `d5-aggregate` groups by kind ("Entities" / "Value Objects"). A single group (e.g. one `Domain`, or an aggregate with no Value Objects) renders as a flat list instead — a heading naming the one thing everything already belongs to wouldn't add anything. `d5-context` groups by kind too ("Aggregates" / "Domain Services" / "Processes"), so a context with only Aggregates stays flat. Each group heading is itself a checkbox — checked when every item in the group is visible, unchecked when none are, indeterminate in between — so unchecking it hides the whole group at once. Click the panel's own heading to collapse/expand the checklist without affecting what's shown in the diagram.

Unlike `attachPanZoom` (a pure post-render transform), toggling changes the actual layout, so it needs the parsed data — not just an SVG string, which is all `mermaid.render()` hands back. Parse with this package's own `parse<Type>` directly instead; the toggle helper performs the first render too, so that's the only step before attaching it:

```typescript
import { D5DomainDb, parseDomain, attachDomainToggle } from 'd5-mermaid';

const db = new D5DomainDb();
parseDomain(src, db);

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
container.appendChild(svg);
attachDomainToggle(svg, db, container);
```

The other three follow the same shape: `D5SubdomainDb`/`parseSubdomain`/`attachSubdomainToggle`, `D5ContextDb`/`parseContext`/`attachContextToggle`, `D5AggregateDb`/`parseAggregate`/`attachAggregateToggle`. Each returns a handle — `{ show(id), hide(id), toggle(id), isVisible(id), getHiddenIds(), destroy() }` — and takes an options object: `panel` (`true`; draws the checklist), `panelTitle` (`"Show"`), `collapsed` (`false`; start the checklist collapsed), `initiallyHidden` (an iterable of ids to start unchecked), and `onChange` (called with the current visible-id set after every re-render — handy for calling an `attachPanZoom` instance's `.fit()` on the same svg, since hiding things changes the diagram's size).

`attachPanZoom` and an `attach<Type>Toggle` can be pointed at the same container (see `examples/one.html?toggle=1`) — mark any overlay UI you add there yourself with `markOverlay` so `attachPanZoom`'s drag handling skips it too, the same way its own controls and the toggle checklist do.

## Exporting as PNG

`attachExport` adds a "PNG" button to the top-right of the diagram that downloads it as a high-resolution PNG. The SVG is vector, so the export is rasterized at 4× its natural size by default — a typical diagram comes out several thousand pixels wide, enough to zoom into without going soft. Dependency-free: it clones the SVG, bakes the styles the browser resolved from your page's CSS into the clone (an SVG loaded as an image can't see the page's stylesheets), and draws it onto a canvas.

```typescript
import { attachExport } from 'd5-mermaid';

const { svg } = await mermaid.render('my-diagram', src);
container.innerHTML = svg;
attachExport(container.querySelector('svg'), container);
```

The export always captures the whole diagram at rest, whatever the current pan/zoom, with a small margin around it and an opaque white background. What's drawn is what's exported: components an `attach<Type>Toggle` has unchecked are left out of the PNG too. The button is marked as overlay UI, so it composes with `attachPanZoom` and the toggle checklist on the same container (it sits top-right, clear of both).

`attachExport` returns a handle — `{ toBlob(options?), download(options?), destroy() }` — and takes an options object: `scale` (`4`; pixels per diagram unit), `background` (`"#ffffff"`; any CSS color or `"transparent"`), `padding` (`16`; margin in diagram units), `filename` (the diagram's title, slugified), `label` (`"PNG"`; the button text), `onExport` (called with the blob after the download starts) and `onError` (default `console.error`). `scale` is lowered automatically if the result would exceed `maxDimension` (`16384` px on the longest side) or `maxPixels` (`67108864`, i.e. 8192²) — browsers fail to encode canvases past their own limits, and some mobile ones fail well below these defaults, so lower them if you target those.

To skip the button — export from your own UI, or send the PNG somewhere other than a download — use `exportPng(svg, options)` (resolves with the `Blob`) or `downloadPng(svg, options)` directly; both are exported alongside it.

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
