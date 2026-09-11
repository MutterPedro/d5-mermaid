# Mobility & Delivery — Domain view

Source: modelled after Uber's own publicly-reported business segments — **Mobility**
(rides) and **Delivery** (Eats) — run as two largely independent businesses that share one
real capability: a driver who drives *and* couriers can be authenticated and paid through
the same identity & payouts platform. Chosen to demonstrate a `d5-domain` diagram with
**more than one top-level `Domain` block** and a relationship that crosses between them,
rather than every subdomain rolling up into a single business.

```d5
d5-domain
  title Mobility & Delivery — Domain

  Domain(mobility, "Uber Mobility") {
    Subdomain(ride_matching, "Ride Matching", core)
    Subdomain(surge_pricing, "Surge Pricing", core)
    Subdomain(driver_onboarding, "Driver Onboarding", supporting)
    Subdomain(driver_identity, "Driver Identity & Payouts", generic)
  }

  Domain(delivery, "Uber Eats") {
    Subdomain(order_fulfillment, "Order Fulfillment", core)
    Subdomain(courier_dispatch, "Courier Dispatch", core)
    Subdomain(restaurant_onboarding, "Restaurant Onboarding", supporting)
  }

  Rel(ride_matching, surge_pricing, "requests dynamic price from")
  Rel(driver_onboarding, driver_identity, "registers verified drivers into")
  Rel(restaurant_onboarding, order_fulfillment, "lists menus into")
  Rel(order_fulfillment, courier_dispatch, "assigns ready orders to")
  Rel(courier_dispatch, driver_identity, "authenticates & pays couriers via")
```
