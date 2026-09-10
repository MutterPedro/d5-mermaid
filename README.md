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

## Examples

`examples/` contains D5 models of seven real-world DDD codebases and techniques
(dddsample-core, ddd-by-examples/library, IDDD_Samples, eShopOnContainers, Wolff
Microservices, a Nick-Tune-style Core Domain Chart, all-things-cqrs) — 39 diagrams across
every zoom level.

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
