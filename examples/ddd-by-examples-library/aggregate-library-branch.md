# Library Branch Aggregate (aggregate view)

Source: [ddd-by-examples/library](https://github.com/ddd-by-examples/library),
`io.pillopl.library.lending.librarybranch.model`. A minimal identity aggregate — holds and
checkouts are always scoped to one branch.

```d5
d5-aggregate
  title Library Branch Aggregate

  Aggregate(branch_agg, "Library Branch", root: "Library Branch") {
    Entity(library_branch, "Library Branch")
    ValueObject(branch_id, "Library Branch ID")
    ValueObject(branch_name, "Branch Name")

    Invariants {
      Invariant("A library branch is identified by a stable code that never changes once assigned")
    }
  }
```
