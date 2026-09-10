# Booking Context — Tactical Structure (context view)

Source: [citerus/dddsample-core](https://github.com/citerus/dddsample-core),
`se.citerus.dddsample.domain.model`. Cargo is the central aggregate; Location, Voyage,
Handling Event and Customs Clearance are referenced by id only. Long term definitions and
sentence-length reference labels are intentional — this view is the renderer's worst case.

```d5
d5-context
  title Booking & Contract Management Context

  BoundedContext(booking_ctx, "Booking & Contract Management", team: "Booking Team") {

    Language {
      Term("Cargo", "A shipment booked by a customer, identified by a tracking id and followed from the booking desk through to the moment it is claimed at destination")
      Term("Route Specification", "The origin, destination and arrival deadline that any itinerary assigned to a cargo must satisfy for the cargo to count as correctly routed")
      Term("Itinerary", "The ordered sequence of legs describing exactly how a cargo is loaded onto and unloaded from voyages on its way to the destination")
      Term("Leg", "The load of a cargo onto one voyage at one location and its unload from that same voyage at a later location")
      Term("Delivery", "The current delivery progress of a cargo, derived by replaying its registered handling events against its current itinerary")
      Term("Misrouted", "The state of a cargo whose current itinerary no longer satisfies its route specification and therefore needs re-routing")
    }

    Aggregate(cargo_agg, "Cargo", root: "Cargo", fields: "Tracking ID, Route Specification, Itinerary, Delivery, Customs Status")
    Aggregate(location_agg, "Location", root: "Location", fields: "UN/LOCODE, Name")
    Aggregate(voyage_agg, "Voyage", root: "Voyage", fields: "Voyage Number, Schedule")
    Aggregate(handling_event_agg, "Handling Event", root: "Handling Event", fields: "Type, Completion Time, Location, Voyage")
    Aggregate(customs_clearance_agg, "Customs Clearance", root: "Clearance", fields: "Status, Clearance Point, Cleared At")

    ReadModel(tracking_view, "Cargo Tracking View")

    Rel(cargo_agg, location_agg, "origin & destination referenced by UN/LOCODE")
    Rel(cargo_agg, voyage_agg, "itinerary legs reference voyages by voyage number")
    Rel(handling_event_agg, cargo_agg, "recorded against a cargo by tracking id")
    Rel(handling_event_agg, voyage_agg, "carries the voyage number it was performed on")
    Rel(customs_clearance_agg, cargo_agg, "clears a cargo referenced by tracking id")

    Event(handling_event_agg, cargo_agg, "CargoWasHandled")
    Event(customs_clearance_agg, cargo_agg, "CargoClearedCustoms")
    Event(cargo_agg, tracking_view, "CargoDeliveryRecalculated")
    Event(handling_event_agg, tracking_view, "CargoWasHandled")

    Policy(handling_event_agg, cargo_agg, "when a handling event is registered, recalculate the cargo's delivery")
    Policy(cargo_agg, cargo_agg, "when the route specification changes, re-check routing status and flag if misrouted")
  }
```
