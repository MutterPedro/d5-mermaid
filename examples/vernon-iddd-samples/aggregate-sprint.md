# Sprint Aggregate (aggregate view)

Source: [VaughnVernon/IDDD_Samples](https://github.com/VaughnVernon/IDDD_Samples),
`com.saasovation.agilepm.domain.model.product.sprint`. A Sprint holds the ids of the
backlog items committed to it and enforces the commitment rules.

```d5
d5-aggregate
  title Sprint Aggregate

  Aggregate(sprint_agg, "Sprint", root: "Sprint") {
    Entity(sprint, "Sprint")
    ValueObject(sprint_id, "Sprint ID")
    ValueObject(goals, "Sprint Goals")
    ValueObject(date_range, "Date Range")
    ValueObject(committed_item, "Committed Backlog Item")

    Invariants {
      Invariant("A sprint's end date must fall after its begin date")
      Invariant("Only a backlog item already scheduled into a release may be committed to a sprint")
      Invariant("Committing a backlog item that is already committed elsewhere first uncommits it from the other sprint")
    }
  }
```
