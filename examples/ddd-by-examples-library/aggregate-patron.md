# Patron Aggregate (aggregate view)

Source: [ddd-by-examples/library](https://github.com/ddd-by-examples/library),
`io.pillopl.library.lending.patron.model`. The Patron aggregate is where the
place-on-hold policies live — its invariants are those policies stated as rules.

```d5
d5-aggregate
  title Patron Aggregate

  Aggregate(patron_agg, "Patron", root: "Patron") {
    Entity(patron, "Patron")
    ValueObject(patron_id, "Patron ID")
    ValueObject(patron_type, "Patron Type")
    ValueObject(patron_holds, "Patron Holds")
    ValueObject(hold, "Hold")
    ValueObject(hold_duration, "Hold Duration")
    ValueObject(overdue_checkouts, "Overdue Checkouts")

    Invariants {
      Invariant("A regular patron holds at most 5 books at any moment; a researcher patron has no hold limit")
      Invariant("Only a researcher patron may place a hold on a restricted book — a regular patron is always rejected")
      Invariant("Only a researcher patron may request an open-ended hold duration")
      Invariant("A patron with more than 2 overdue checkouts at a branch cannot place a hold at that same branch")
      Invariant("Hold", "A hold can be cancelled only while it is active — never once it has been completed or has expired")
    }
  }
```
