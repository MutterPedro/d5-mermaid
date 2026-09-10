# Credit Card — Domain view

Source: [ddd-by-examples/all-things-cqrs](https://github.com/ddd-by-examples/all-things-cqrs)
— a deliberately tiny app whose only job is to show the many ways to synchronise a command
side (a `CreditCard` in H2) with a query side (withdrawals in MongoDB). A single core
subdomain with a reporting side around it.

```d5
d5-domain
  title Credit Card — Domain
  direction LR

  Domain(credit_card, "Credit Card") {
    Subdomain(card, "Credit Card", core)
    Subdomain(reporting, "Card Withdrawals Reporting", supporting)
  }

  Rel(reporting, card, "projects each card's withdrawals from")
```
