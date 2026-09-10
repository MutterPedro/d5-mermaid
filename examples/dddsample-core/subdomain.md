# Cargo Shipping — Context Map (subdomain view)

Source: [citerus/dddsample-core](https://github.com/citerus/dddsample-core). The application
decomposed into the bounded contexts it teaches (Booking, Cargo, Routing, Tracking,
Handling) plus the shared reference contexts and the surrounding compliance / finance
contexts. Deliberately dense: 11 bounded contexts across 8 subdomains, 15 relationships,
full-length DDD pattern names.

```d5
d5-subdomain
  title Cargo Shipping — Context Map
  direction LR

  Subdomain(booking, "Cargo Booking & Contracts", core) {
    BoundedContext(booking_ctx, "Booking", team: "Booking Team")
    BoundedContext(cargo_ctx, "Cargo", team: "Cargo Team")
  }

  Subdomain(tracking, "Cargo Tracking & Delivery Status", core) {
    BoundedContext(tracking_ctx, "Cargo Tracking", team: "Tracking Team")
  }

  Subdomain(routing, "Itinerary Routing & Optimization", supporting) {
    BoundedContext(routing_ctx, "Routing", team: "Routing Team")
    BoundedContext(pathfinder, "External Graph Traversal Service", team: "3rd-party (Pathfinder Inc.)")
  }

  Subdomain(handling, "Cargo Handling & Event Capture", supporting) {
    BoundedContext(handling_ctx, "Handling", team: "Handling Team")
    BoundedContext(handling_report_ctx, "Handling Report Import", team: "Integrations Team")
  }

  Subdomain(customs, "Customs Clearance & Compliance", supporting) {
    BoundedContext(customs_ctx, "Customs Clearance", team: "Compliance Team")
  }

  Subdomain(location, "Location & UN/LOCODE Registry", generic) {
    BoundedContext(location_ctx, "Location Registry", team: "Platform Team")
  }

  Subdomain(voyage, "Voyage Schedule & Carrier Movements", generic) {
    BoundedContext(voyage_ctx, "Voyage Schedule", team: "Platform Team")
  }

  Subdomain(billing, "Freight Billing & Invoicing", generic) {
    BoundedContext(billing_ctx, "Freight Billing", team: "Finance Team")
  }

  Rel(booking_ctx, routing_ctx, "Customer-Supplier")
  Rel(routing_ctx, pathfinder, "Anti-Corruption Layer")
  Rel(booking_ctx, cargo_ctx, "Shared Kernel")
  Rel(cargo_ctx, tracking_ctx, "Shared Kernel")
  Rel(handling_report_ctx, handling_ctx, "Open Host Service")
  Rel(handling_ctx, tracking_ctx, "Customer-Supplier")
  Rel(handling_ctx, location_ctx, "Conformist")
  Rel(handling_ctx, voyage_ctx, "Conformist")
  Rel(location_ctx, voyage_ctx, "Partnership")
  Rel(booking_ctx, location_ctx, "Conformist")
  Rel(booking_ctx, voyage_ctx, "Conformist")
  Rel(routing_ctx, voyage_ctx, "Conformist")
  Rel(customs_ctx, tracking_ctx, "Customer-Supplier")
  Rel(customs_ctx, cargo_ctx, "Conformist")
  Rel(billing_ctx, tracking_ctx, "Published Language")
  Rel(billing_ctx, booking_ctx, "Conformist")
```
