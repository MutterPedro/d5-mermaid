# Backlog Item Aggregate (aggregate view)

Source: [VaughnVernon/IDDD_Samples](https://github.com/VaughnVernon/IDDD_Samples),
`com.saasovation.agilepm.domain.model.product.backlogitem`. The canonical IDDD aggregate:
a Backlog Item root with Task entities, and a small set of invariants around estimation and
sprint commitment.

```d5
d5-aggregate
  title Backlog Item Aggregate

  Aggregate(backlog_item_agg, "Backlog Item", root: "Backlog Item") {
    Entity(backlog_item, "Backlog Item")
    Entity(task, "Task")
    ValueObject(backlog_item_id, "Backlog Item ID")
    ValueObject(story, "Story")
    ValueObject(item_type, "Backlog Item Type")
    ValueObject(status, "Backlog Item Status")
    ValueObject(story_points, "Story Points")
    ValueObject(sprint_ref, "Committed Sprint")
    ValueObject(estimation_log_entry, "Task Hours Log Entry")

    Invariants {
      Invariant("A backlog item may be committed to at most one sprint at any given time")
      Invariant("A backlog item can be committed to a sprint only after it has been scheduled into a release")
      Invariant("Status", "It is marked Done only once every one of its tasks reports zero hours remaining")
      Invariant("Re-estimating a committed backlog item's story points to zero automatically uncommits it from its sprint")
      Invariant("Task hours-remaining is kept as an append-only log; the current estimate is the most recent entry")
    }
  }
```
