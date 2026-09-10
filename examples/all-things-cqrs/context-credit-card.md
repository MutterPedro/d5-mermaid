# Credit Card Context — Tactical Structure (context view)

Source: [ddd-by-examples/all-things-cqrs](https://github.com/ddd-by-examples/all-things-cqrs),
`io.dddbyexamples.cqrs`. The reference shape for CQRS: one write aggregate, one read model,
domain events that synchronise them, and the cycle-rollover policy.

```d5
d5-context
  title Credit Card Context — Tactical Structure
  direction LR

  BoundedContext(card_ctx, "Credit Card", team: "Card Team") {

    Language {
      Term("Credit Card", "A card with a one-time assigned credit limit that withdrawals are drawn against and repayments credited back to")
      Term("Assigned Limit", "The credit limit set once when the card is opened; it never changes afterwards")
      Term("Available Limit", "The assigned limit minus the currently used limit — the most that can still be withdrawn")
      Term("Withdrawal", "A draw-down against the available limit; each one increases the used limit and is counted towards the cycle quota")
      Term("Repayment", "A payment back onto the card that decreases the used limit, never below zero")
      Term("Billing Cycle", "The window within which at most 45 withdrawals are permitted; closing it resets the count")
    }

    Aggregate(card_agg, "Credit Card", root: "Credit Card", fields: "Card ID, Assigned Limit, Used Limit, Withdrawals This Cycle")

    ReadModel(withdrawals_view, "Withdrawals View")

    Event(card_agg, withdrawals_view, "LimitAssigned")
    Event(card_agg, withdrawals_view, "CardWithdrawn")

    Policy(card_agg, card_agg, "when a billing cycle is closed, reset the withdrawal count and start the next cycle")
    Policy(card_agg, withdrawals_view, "on each CardWithdrawn event, append the amount to that card's withdrawals list (eventually consistent, via Kafka)")
  }
```
