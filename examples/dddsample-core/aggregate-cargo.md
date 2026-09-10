# Cargo Aggregate (aggregate view)

Source: [citerus/dddsample-core](https://github.com/citerus/dddsample-core),
`se.citerus.dddsample.domain.model.cargo`. Cargo is the only entity; everything else is a
value object. The `Invariants` block spells out why Cargo is a consistency boundary — the
rules its root keeps true on every transaction.

```d5
d5-aggregate
  title Cargo Aggregate

  Aggregate(cargo_agg, "Cargo", root: "Cargo") {
    Entity(cargo, "Cargo")
    ValueObject(tracking_id, "Tracking ID")
    ValueObject(route_specification, "Route Specification")
    ValueObject(itinerary, "Itinerary")
    ValueObject(leg, "Leg")
    ValueObject(delivery, "Delivery")
    ValueObject(transport_status, "Transport Status")
    ValueObject(routing_status, "Routing Status")
    ValueObject(estimated_time_of_arrival, "Estimated Time of Arrival")
    ValueObject(last_known_location, "Last Known Location")
    ValueObject(next_expected_activity, "Next Expected Handling Activity")

    Invariants {
      Invariant("A cargo's itinerary must satisfy its route specification: same origin and destination, and arrival no later than the deadline")
      Invariant("Delivery", "Delivery is a pure projection of the registered handling-event history against the current itinerary and is never assigned directly")
      Invariant("Routing status is MISROUTED whenever the current itinerary does not satisfy the route specification")
      Invariant("Once transport status reaches CLAIMED the cargo is terminal and rejects any further handling events")
      Invariant("Assigning a new route specification recalculates routing status within the same transaction")
    }
  }
```
