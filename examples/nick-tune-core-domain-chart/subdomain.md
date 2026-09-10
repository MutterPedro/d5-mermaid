# Fashion Retailer — Context Map (subdomain view)

Source: strategic modelling in the style of Nick Tune. One bounded context per subdomain.
Checkout is the orchestration hub; Pricing publishes an effective price book; the two core
contexts consume catalogue and inventory data.

```d5
d5-subdomain
  title Fashion Retailer — Context Map
  direction LR

  Subdomain(pricing, "Dynamic Pricing & Promotions", core) {
    BoundedContext(pricing_ctx, "Pricing", team: "Pricing Team")
  }

  Subdomain(recommendations, "Personalised Recommendations", core) {
    BoundedContext(reco_ctx, "Recommendations", team: "Data Science Team")
  }

  Subdomain(inventory, "Inventory & Availability", supporting) {
    BoundedContext(inventory_ctx, "Inventory", team: "Supply Team")
  }

  Subdomain(catalog, "Product Catalogue", supporting) {
    BoundedContext(catalog_ctx, "Catalogue", team: "Merchandising Team")
  }

  Subdomain(checkout, "Checkout & Cart", supporting) {
    BoundedContext(checkout_ctx, "Checkout", team: "Storefront Team")
  }

  Subdomain(fulfilment, "Order Fulfilment", supporting) {
    BoundedContext(fulfilment_ctx, "Fulfilment", team: "Operations Team")
  }

  Subdomain(payments, "Payments", generic) {
    BoundedContext(payments_ctx, "Payments", team: "Platform Team")
  }

  Subdomain(identity, "Customer Identity", generic) {
    BoundedContext(identity_ctx, "Identity", team: "Platform Team")
  }

  Rel(pricing_ctx, checkout_ctx, "Published Language")
  Rel(reco_ctx, checkout_ctx, "Open Host Service")
  Rel(catalog_ctx, reco_ctx, "Published Language")
  Rel(catalog_ctx, pricing_ctx, "Conformist")
  Rel(inventory_ctx, pricing_ctx, "Conformist")
  Rel(inventory_ctx, checkout_ctx, "Customer-Supplier")
  Rel(checkout_ctx, fulfilment_ctx, "Published Language")
  Rel(inventory_ctx, fulfilment_ctx, "Customer-Supplier")
  Rel(identity_ctx, checkout_ctx, "Open Host Service")
  Rel(payments_ctx, checkout_ctx, "Anti-Corruption Layer")
```
