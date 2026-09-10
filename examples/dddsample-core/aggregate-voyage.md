# Voyage Aggregate (aggregate view)

Source: [citerus/dddsample-core](https://github.com/citerus/dddsample-core),
`se.citerus.dddsample.domain.model.voyage`. Voyage has a clear identity (Voyage Number) and
carries a Schedule of Carrier Movements. Its invariants keep the schedule internally
consistent.

```d5
d5-aggregate
  title Voyage Aggregate

  Aggregate(voyage_agg, "Voyage", root: "Voyage") {
    Entity(voyage, "Voyage")
    ValueObject(voyage_number, "Voyage Number")
    ValueObject(schedule, "Schedule")
    ValueObject(carrier_movement, "Carrier Movement")

    Invariants {
      Invariant("Carrier movements in the schedule are contiguous: each one departs from the arrival location of the previous movement")
      Invariant("Every carrier movement arrives strictly after it departs")
      Invariant("Voyage number is immutable once the voyage has been created")
    }
  }
```
