# Pricing Context — Tactical Structure (context view)

Source: a plausible tactical model for the Dynamic Pricing & Promotions core context. Base
prices are computed from a stack of prioritised **Price Rules**; **Promotions** layer
discounts on top, bounded by a redemption budget.

```d5
d5-context
  title Pricing Context — Tactical Structure
  direction LR

  BoundedContext(pricing_ctx, "Pricing", team: "Pricing Team") {

    Language {
      Term("Price Rule", "A prioritised rule that computes a base price for a scope of products — a category, a brand or a single SKU")
      Term("Effective Price", "The price a shopper actually sees: the winning base price rule for the SKU with any applicable promotion applied")
      Term("Promotion", "A time-boxed discount identified by a code, applied on top of the base price when its conditions are met, capped by a redemption budget")
      Term("Markdown", "A price rule that lowers price as stock ages or availability rises — reads live inventory levels")
      Term("Redemption Budget", "The maximum number of times a promotion may be applied before it self-deactivates")
      Term("Rule Priority", "Higher-priority rules win; ties are broken by the most specific scope (SKU over brand over category)")
    }

    Aggregate(price_rule_agg, "Price Rule", root: "Price Rule", fields: "Scope, Formula, Priority, Active Window")
    Aggregate(promotion_agg, "Promotion", root: "Promotion", fields: "Code, Discount, Conditions, Redemption Budget, Redemptions")

    ReadModel(effective_price_book, "Effective Price Book")

    Rel(promotion_agg, price_rule_agg, "a promotion layers on top of the winning base price rule for a scope")

    Event(price_rule_agg, effective_price_book, "PriceRuleChanged")
    Event(promotion_agg, effective_price_book, "PromotionActivated")

    Policy(promotion_agg, promotion_agg, "when a promotion's redemption budget is exhausted, deactivate it immediately")
    Policy(price_rule_agg, effective_price_book, "when any price rule or promotion changes, recompute the effective price for every affected SKU")
  }
```
