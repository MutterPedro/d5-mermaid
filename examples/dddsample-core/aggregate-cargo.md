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

    Has(cargo, tracking_id, as: "identity")
    Has(cargo, route_specification)
    Has(cargo, itinerary, optional)
    Has(cargo, delivery)
    Has(itinerary, leg, at_least_one, as: "legs")
    Has(delivery, transport_status)
    Has(delivery, routing_status)
    Has(delivery, estimated_time_of_arrival, optional)
    Has(delivery, last_known_location, optional)
    Has(delivery, next_expected_activity, optional)

    Ref(route_specification, location_agg, as: "origin & destination")
    Ref(leg, location_agg, as: "load & unload")
    Ref(leg, voyage_agg, as: "voyage")

    Command(specify_route, "Specify New Route")
    Command(assign_to_route, "Assign To Route")
    Command(derive_progress, "Derive Delivery Progress")

    Lifecycle {
      State(s_not_received, "Not Received")
      State(s_in_port, "In Port")
      State(s_onboard, "Onboard Carrier")
      State(s_claimed, "Claimed")

      Transition(s_not_received, s_in_port, on: derive_progress)
      Transition(s_in_port, s_onboard, on: derive_progress)
      Transition(s_onboard, s_in_port, on: derive_progress)
      Transition(s_in_port, s_claimed, on: derive_progress)
    }

    Invariants {
      Invariant("A cargo's itinerary must satisfy its route specification: same origin and destination, and arrival no later than the deadline")
      Invariant("Delivery", "Delivery is a pure projection of the registered handling-event history against the current itinerary and is never assigned directly")
      Invariant("Routing status is MISROUTED whenever the current itinerary does not satisfy the route specification")
      Invariant("Once transport status reaches CLAIMED the cargo is terminal and rejects any further handling events")
      Invariant("Assigning a new route specification recalculates routing status within the same transaction")
    }
  }

  Aggregate(location_agg, "Location", root: "Location")
  Aggregate(voyage_agg, "Voyage", root: "Voyage")
```
