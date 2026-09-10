# Handling Event Aggregate (aggregate view)

Source: [citerus/dddsample-core](https://github.com/citerus/dddsample-core),
`se.citerus.dddsample.domain.model.handling`. HandlingEvent is a domain event with identity
but an extremely limited life-cycle; kept in its own aggregate for performance. Its
invariants are the validation rules the root applies before an event is accepted.

```d5
d5-aggregate
  title Handling Event Aggregate

  Aggregate(handling_agg, "Handling Event", root: "Handling Event") {
    Entity(handling_event, "Handling Event")
    ValueObject(handling_type, "Handling Type")
    ValueObject(completion_time, "Completion Time")
    ValueObject(registration_time, "Registration Time")
    ValueObject(location_ref, "Location (UN/LOCODE)")
    ValueObject(voyage_ref, "Voyage Number")

    Invariants {
      Invariant("Completion time (when the event happened) must not be after registration time (when the system was told about it)")
      Invariant("LOAD and UNLOAD events must carry a voyage number; RECEIVE, CLAIM and CUSTOMS events must not")
      Invariant("Type", "Handling type is one of RECEIVE, LOAD, UNLOAD, CUSTOMS or CLAIM and is fixed at creation")
    }
  }
```
