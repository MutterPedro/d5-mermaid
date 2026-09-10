# Product Aggregate (aggregate view)

Source: [VaughnVernon/IDDD_Samples](https://github.com/VaughnVernon/IDDD_Samples),
`com.saasovation.agilepm.domain.model.product`. Product is a small root that keeps only ids
of its backlog items, releases and sprints — and, when collaboration is enabled, a
reference to its discussion.

```d5
d5-aggregate
  title Product Aggregate

  Aggregate(product_agg, "Product", root: "Product") {
    Entity(product, "Product")
    ValueObject(product_id, "Product ID")
    ValueObject(product_owner_id, "Product Owner")
    ValueObject(name, "Name")
    ValueObject(description, "Description")
    ValueObject(discussion, "Product Discussion")

    Invariants {
      Invariant("A product always has exactly one product owner")
      Invariant("Discussion", "When collaboration is enabled the product holds a reference to its discussion; until then the discussion is only 'requested' and is attached asynchronously")
      Invariant("Backlog items, releases and sprints are only ever created in the context of their owning product")
    }
  }
```
