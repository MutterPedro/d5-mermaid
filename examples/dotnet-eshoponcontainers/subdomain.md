# eShop — Context Map (subdomain view)

Source: [dotnet-architecture/eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers).
Each microservice is its own bounded context with its own database. Identity is an Open
Host Service (OIDC); Catalog and Payment publish integration events other contexts subscribe
to; Basket is the upstream customer that starts the ordering process.

```d5
d5-subdomain
  title eShop — Context Map
  direction LR

  Subdomain(ordering, "Order Management", core) {
    BoundedContext(ordering_ctx, "Ordering", team: "Ordering Team")
  }

  Subdomain(catalog, "Product Catalog", supporting) {
    BoundedContext(catalog_ctx, "Catalog", team: "Catalog Team")
  }

  Subdomain(basket, "Shopping Basket", supporting) {
    BoundedContext(basket_ctx, "Basket", team: "Basket Team")
  }

  Subdomain(marketing, "Marketing & Campaigns", supporting) {
    BoundedContext(marketing_ctx, "Marketing", team: "Marketing Team")
  }

  Subdomain(payment, "Payment Processing", generic) {
    BoundedContext(payment_ctx, "Payment", team: "Payments Team")
  }

  Subdomain(identity, "Identity & Access", generic) {
    BoundedContext(identity_ctx, "Identity", team: "Platform Team")
  }

  Rel(identity_ctx, ordering_ctx, "Open Host Service")
  Rel(identity_ctx, basket_ctx, "Open Host Service")
  Rel(catalog_ctx, basket_ctx, "Published Language")
  Rel(catalog_ctx, ordering_ctx, "Published Language")
  Rel(basket_ctx, ordering_ctx, "Customer-Supplier")
  Rel(ordering_ctx, payment_ctx, "Customer-Supplier")
  Rel(marketing_ctx, catalog_ctx, "Conformist")
```
