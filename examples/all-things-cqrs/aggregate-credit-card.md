# Credit Card Aggregate (aggregate view)

Source: [ddd-by-examples/all-things-cqrs](https://github.com/ddd-by-examples/all-things-cqrs),
`io.dddbyexamples.cqrs.commanddomain.CreditCard`. A small write-side aggregate whose
invariants are exactly the guards on `assignLimit`, `withdraw`, `repay` and `closeCycle`.

```d5
d5-aggregate
  title Credit Card Aggregate

  Aggregate(card_agg, "Credit Card", root: "Credit Card") {
    Entity(credit_card, "Credit Card")
    Entity(withdrawal, "Withdrawal")
    ValueObject(card_id, "Card ID")
    ValueObject(assigned_limit, "Assigned Limit")
    ValueObject(used_limit, "Used Limit")
    ValueObject(available_limit, "Available Limit")
    ValueObject(billing_cycle, "Billing Cycle")
    ValueObject(amount, "Amount")

    Invariants {
      Invariant("The credit limit is assigned exactly once — a second assignment is rejected")
      Invariant("A withdrawal is permitted only while its amount is within the available limit (assigned limit − used limit)")
      Invariant("At most 45 withdrawals are permitted within a single billing cycle")
      Invariant("A repayment decreases the used limit but never takes it below zero")
    }
  }
```
