# Agile PM Context — Tactical Structure (context view)

Source: [VaughnVernon/IDDD_Samples](https://github.com/VaughnVernon/IDDD_Samples),
`com.saasovation.agilepm`. Product is the entry point; Backlog Items, Releases and Sprints
are separate aggregates referenced from the product backlog by id.

```d5
d5-context
  title Agile PM Context — Tactical Structure
  direction LR

  BoundedContext(agilepm_ctx, "Agile PM", team: "ProjectOvation Team") {

    Language {
      Term("Product", "The overarching thing a team is building; it owns the product backlog and every release and sprint planned against it")
      Term("Backlog Item", "One planned unit of work on a product backlog — a story with a type, a status, a story-point estimate and a set of tasks")
      Term("Task", "A concrete piece of work inside a backlog item, tracked by the hours estimated to remain until it is done")
      Term("Sprint", "A fixed time-box in which a team commits to completing a selected set of backlog items")
      Term("Release", "A named future point by which a selected set of backlog items is intended to ship")
      Term("Story Points", "A team's relative estimate of a backlog item's size — deliberately not a time estimate")
      Term("Product Owner", "The single person accountable for the content and ordering of the product backlog")
    }

    Aggregate(product_agg, "Product", root: "Product", fields: "Product Owner, Backlog Items, Planned Releases, Scheduled Sprints")
    Aggregate(backlog_item_agg, "Backlog Item", root: "Backlog Item", fields: "Story, Type, Status, Story Points, Tasks")
    Aggregate(release_agg, "Release", root: "Release", fields: "Name, Begins, Ends, Scheduled Backlog Items")
    Aggregate(sprint_agg, "Sprint", root: "Sprint", fields: "Goals, Begins, Ends, Committed Backlog Items")
    Aggregate(team_agg, "Team", root: "Team", fields: "Product Owner, Team Members")

    ReadModel(sprint_board, "Sprint Board")

    Rel(product_agg, backlog_item_agg, "the product backlog references its items by id")
    Rel(product_agg, release_agg, "the product references its planned releases by id")
    Rel(product_agg, sprint_agg, "the product references its scheduled sprints by id")
    Rel(release_agg, backlog_item_agg, "schedules backlog items into a release by id")
    Rel(sprint_agg, backlog_item_agg, "commits backlog items to a sprint by id")
    Rel(team_agg, product_agg, "a team owns a product referenced by id")

    Event(release_agg, backlog_item_agg, "BacklogItemScheduled")
    Event(sprint_agg, backlog_item_agg, "BacklogItemCommitted")
    Event(sprint_agg, sprint_board, "BacklogItemCommitted")
    Event(backlog_item_agg, sprint_board, "TaskHoursRemainingEstimated")

    Policy(backlog_item_agg, sprint_agg, "when a committed backlog item is re-estimated to zero points, uncommit it from its sprint")
  }
```
