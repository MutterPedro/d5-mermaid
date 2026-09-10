# Credit Card — Context Map (subdomain view)

Source: [ddd-by-examples/all-things-cqrs](https://github.com/ddd-by-examples/all-things-cqrs).
The command side owns the `CreditCard` aggregate (H2); the query side owns the withdrawals
list (MongoDB). They are kept in sync by `CardWithdrawn` domain events published to Kafka —
a Published Language the query side conforms to.

```d5
d5-subdomain
  title Credit Card — Context Map
  direction LR

  Subdomain(card, "Credit Card", core) {
    BoundedContext(card_ctx, "Credit Card (command)", team: "Card Team")
  }

  Subdomain(reporting, "Card Withdrawals Reporting", supporting) {
    BoundedContext(withdrawals_ctx, "Withdrawals (query)", team: "Card Team")
  }

  Rel(card_ctx, withdrawals_ctx, "Published Language")
```
