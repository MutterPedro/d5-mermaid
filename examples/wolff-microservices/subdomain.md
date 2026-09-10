# Webshop — Context Map (subdomain view)

Source: Eberhard Wolff, *Microservices*. Each service is its own bounded context with its
own database. Order publishes an order message as a Published Language that Delivery and
Billing conform to; Catalog and Customer are upstream reference data.

```d5
d5-subdomain
  title Webshop — Context Map
  direction LR

  Subdomain(order, "Order Process", core) {
    BoundedContext(order_ctx, "Order", team: "Order Team")
  }

  Subdomain(catalog, "Product Catalog", supporting) {
    BoundedContext(catalog_ctx, "Catalog", team: "Catalog Team")
  }

  Subdomain(customer, "Customer Management", supporting) {
    BoundedContext(customer_ctx, "Customer", team: "Customer Team")
  }

  Subdomain(delivery, "Delivery", supporting) {
    BoundedContext(delivery_ctx, "Delivery", team: "Delivery Team")
  }

  Subdomain(billing, "Billing & Invoicing", supporting) {
    BoundedContext(billing_ctx, "Billing", team: "Billing Team")
  }

  Rel(catalog_ctx, order_ctx, "Conformist")
  Rel(customer_ctx, order_ctx, "Customer-Supplier")
  Rel(order_ctx, delivery_ctx, "Published Language")
  Rel(order_ctx, billing_ctx, "Published Language")
  Rel(customer_ctx, billing_ctx, "Conformist")
```
