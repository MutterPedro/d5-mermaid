# Promotion Aggregate (aggregate view)

Source: a plausible model for the Pricing core context. Promotions self-limit against a
redemption budget and only one applies per order unless marked stackable.

```d5
d5-aggregate
  title Promotion Aggregate

  Aggregate(promotion_agg, "Promotion", root: "Promotion") {
    Entity(promotion, "Promotion")
    Entity(redemption, "Redemption")
    ValueObject(promotion_id, "Promotion ID")
    ValueObject(code, "Promo Code")
    ValueObject(discount, "Discount")
    ValueObject(conditions, "Conditions")
    ValueObject(redemption_budget, "Redemption Budget")
    ValueObject(redemption_count, "Redemption Count")
    ValueObject(valid_window, "Valid Window")

    Invariants {
      Invariant("A promo code is unique and case-insensitive across all currently active promotions")
      Invariant("Redemption count never exceeds the redemption budget — the promotion deactivates itself on reaching it")
      Invariant("A promotion applies only when every one of its conditions is satisfied by the cart at checkout time")
      Invariant("Stacking", "At most one promotion applies per order unless the promotion is explicitly marked stackable")
    }
  }
```
