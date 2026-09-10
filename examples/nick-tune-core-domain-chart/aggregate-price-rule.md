# Price Rule Aggregate (aggregate view)

Source: a plausible model for the Pricing core context. The invariants capture the
rule-resolution logic that makes this a differentiating, complex subdomain.

```d5
d5-aggregate
  title Price Rule Aggregate

  Aggregate(price_rule_agg, "Price Rule", root: "Price Rule") {
    Entity(price_rule, "Price Rule")
    ValueObject(rule_id, "Rule ID")
    ValueObject(scope, "Scope")
    ValueObject(formula, "Pricing Formula")
    ValueObject(priority, "Priority")
    ValueObject(active_window, "Active Window")
    ValueObject(base_currency, "Base Currency")

    Invariants {
      Invariant("Exactly one base price rule is in force for any SKU at any moment — the highest-priority active rule whose scope matches")
      Invariant("A rule's active window starts no later than it ends")
      Invariant("Priority", "Ties in priority are broken by the most specific scope: SKU beats brand beats category")
      Invariant("The formula result is floored at zero — a rule can never produce a negative effective price")
    }
  }
```
