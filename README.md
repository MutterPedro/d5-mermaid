# d5-mermaid

A [Mermaid.js](https://mermaid.js.org/) extension for **D5 (Domain Driven Design Definitive Diagrams)** — visualize DDD strategic and tactical patterns as diagrams.

D5 provides four diagram types at progressive zoom levels, inspired by the C4 model but focused on the domain model rather than technical architecture.

## Diagram Types

| Diagram | Keyword | What it shows |
|---|---|---|
| **Domain** | `d5-domain` | Strategic overview: subdomains and their relationships |
| **Subdomain** | `d5-subdomain` | Context map: bounded contexts within subdomains, DDD relationship patterns |
| **Context** | `d5-context` | Tactical structure: aggregates, ubiquitous language within a bounded context |
| **Aggregate** | `d5-aggregate` | Domain objects: entities and value objects within an aggregate |

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

// Now Mermaid can render D5 diagrams
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

### d5-domain

Shows the strategic overview of your business domain.

```
d5-domain
  title ACME Retail Platform

  Domain(acme, "ACME Retail") {
    Subdomain(catalog, "Product Catalog", core)
    Subdomain(ordering, "Order Management", core)
    Subdomain(inventory, "Inventory", supporting)
    Subdomain(payments, "Payments", generic)
    Subdomain(pricing, "Pricing", generic)
  }

  Rel(ordering, catalog, "depends on")
  Rel(ordering, payments, "depends on")
  Rel(ordering, pricing, "depends on")
  Rel(payments, pricing)
```

Subdomain types: `core`, `supporting`, `generic`.

### d5-subdomain

Shows bounded contexts within subdomains and their DDD relationship patterns.

```
d5-subdomain
  title Context Map

  Subdomain(catalog, "Product Catalog", core) {
    BoundedContext(product_ctx, "Product Context", team: "Catalog Team")
    BoundedContext(pricing_ctx, "Pricing Context")
  }

  Subdomain(ordering, "Order Management", core) {
    BoundedContext(order_ctx, "Order Context", team: "Order Squad")
  }

  Subdomain(inventory, "Inventory", supporting) {
    BoundedContext(stock_ctx, "Stock Context")
  }

  Subdomain(identity, "Identity", generic) {
    BoundedContext(auth_ctx, "Auth Context")
  }

  Rel(order_ctx, pricing_ctx, "Conformist")
  Rel(pricing_ctx, product_ctx, "Partnership")
  Rel(order_ctx, stock_ctx, "ACL")
  Rel(order_ctx, auth_ctx, "Open Host Service")
  Rel(stock_ctx, product_ctx, "Customer-Supplier")
```

Relationship types: Partnership, Shared Kernel, Customer-Supplier, Conformist, ACL, Open Host Service, Published Language.

### d5-context

Shows the tactical structure within a single bounded context.

```
d5-context
  title Order Context

  BoundedContext(order_ctx, "Order Context", team: "Order Squad") {
    Language {
      Term("Order", "A confirmed purchase request")
      Term("Line Item", "A single product entry within an order")
    }

    Aggregate(order_agg, "Order", root: "Order")
    Aggregate(cart_agg, "Shopping Cart", root: "Cart")

    Rel(order_agg, cart_agg, "references by id")
  }
```

### d5-aggregate

Shows the internal composition of a single aggregate.

```mermaid
d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(line_item, "Line Item")
    ValueObject(money, "Money")
    ValueObject(quantity, "Quantity")
    ValueObject(shipping_address, "Shipping Address")
  }
```

No `Rel` elements — containment within the aggregate implies direct references.

### Comments

```
%% This is a comment
Subdomain(s1, "Sub", core) %% inline comment
```

## Development

```bash
npm install
npm test            # run tests
npm run test:watch  # watch mode
npm run build       # build for distribution
npm run lint        # type-check
```

## License

[MIT](LICENSE)
