# eShop — Domain view

Source: [dotnet-architecture/eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers)
— a reference .NET microservices store. **Order Management** is the one service modelled with
DDD/CQRS; the rest are simple CRUD services around it, and all cross-service updates flow
through an event bus as integration events.

```d5
d5-domain
  title eShop — Domain
  direction LR

  Domain(eshop, "eShop") {
    Subdomain(ordering, "Order Management", core)
    Subdomain(catalog, "Product Catalog", supporting)
    Subdomain(basket, "Shopping Basket", supporting)
    Subdomain(marketing, "Marketing & Campaigns", supporting)
    Subdomain(payment, "Payment Processing", generic)
    Subdomain(identity, "Identity & Access", generic)
  }

  Rel(basket, catalog, "prices basket items using")
  Rel(ordering, basket, "creates an order from a submitted")
  Rel(ordering, catalog, "validates stock & prices for order items against")
  Rel(ordering, payment, "requests payment authorization from")
  Rel(ordering, identity, "resolves the buyer identity via")
  Rel(basket, identity, "scopes a basket to a signed-in user via")
  Rel(marketing, catalog, "targets campaigns at products in")
```
