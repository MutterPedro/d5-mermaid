# Cargo Shipping — Domain view

Source: [citerus/dddsample-core](https://github.com/citerus/dddsample-core) — the canonical
"Cargo" DDD sample application from Eric Evans' book. Strategic roll-up of the shipping
domain, widened to the surrounding subdomains a real freight forwarder runs (customs,
billing) and given long, sentence-like relationship labels on purpose to stress the
renderer.

```d5
d5-domain
  title Cargo Shipping — Domain

  Domain(cargo_shipping, "Cargo Shipping") {
    Subdomain(booking, "Cargo Booking & Contracts", core)
    Subdomain(tracking, "Cargo Tracking & Delivery Status", core)
    Subdomain(routing, "Itinerary Routing & Optimization", supporting)
    Subdomain(handling, "Cargo Handling & Event Capture", supporting)
    Subdomain(customs, "Customs Clearance & Compliance", supporting)
    Subdomain(location, "Location & UN/LOCODE Registry", generic)
    Subdomain(voyage, "Voyage Schedule & Carrier Movements", generic)
    Subdomain(billing, "Freight Billing & Invoicing", generic)
  }

  Rel(booking, routing, "requests candidate itineraries from")
  Rel(booking, location, "resolves origin & destination ports via")
  Rel(booking, voyage, "checks sailing schedules against")
  Rel(booking, billing, "hands confirmed cargo off to")
  Rel(handling, tracking, "streams handling events to")
  Rel(handling, location, "tags events with ports from")
  Rel(handling, voyage, "associates events with voyages from")
  Rel(tracking, booking, "reads cargo, itinerary & delivery from")
  Rel(routing, voyage, "builds legs from schedules in")
  Rel(customs, tracking, "gates delivery progress in")
  Rel(customs, booking, "flags non-compliant cargo in")
  Rel(billing, tracking, "recalculates charges from milestones in")
```
