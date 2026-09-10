# Buyer Aggregate (aggregate view)

Source: [dotnet-architecture/eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers),
`Ordering.Domain.AggregatesModel.BuyerAggregate`. A Buyer root owning its registered
PaymentMethod entities, keyed to the identity service by GUID.

```d5
d5-aggregate
  title Buyer Aggregate

  Aggregate(buyer_agg, "Buyer", root: "Buyer") {
    Entity(buyer, "Buyer")
    Entity(payment_method, "Payment Method")
    ValueObject(buyer_id, "Buyer ID")
    ValueObject(identity_guid, "Identity GUID")
    ValueObject(card_type, "Card Type")
    ValueObject(card_alias, "Card Alias")
    ValueObject(card_number, "Card Number")
    ValueObject(expiration, "Expiration")

    Invariants {
      Invariant("A buyer is uniquely identified by their identity-service GUID")
      Invariant("A payment method is added only once — a card with the same number, expiry and card type is reused, not duplicated")
      Invariant("An order cannot be charged to a payment method whose expiration date has passed")
    }
  }
```
