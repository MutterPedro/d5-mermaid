# Book Aggregate (aggregate view)

Source: [ddd-by-examples/library](https://github.com/ddd-by-examples/library),
`io.pillopl.library.lending.book.model`. Book is modelled as a small state machine —
`AvailableBook` → `BookOnHold` → `CheckedOutBook` → `AvailableBook`.

```d5
d5-aggregate
  title Book Aggregate

  Aggregate(book_agg, "Book", root: "Book") {
    Entity(book, "Book")
    ValueObject(book_id, "Book ID")
    ValueObject(book_state, "Book State")
    ValueObject(book_type, "Book Type")
    ValueObject(library_branch, "Library Branch")
    ValueObject(bound_to_patron, "Bound To Patron")
    ValueObject(hold_placed_at, "Hold Placed At")

    Invariants {
      Invariant("A book is in exactly one state at a time: Available, On Hold, or Checked Out")
      Invariant("An available book can be placed on hold by at most one patron")
      Invariant("State", "State only moves Available → On Hold → Checked Out → Available; cancelling a hold returns the book straight to Available")
      Invariant("A book that is On Hold or Checked Out always records the patron and the branch it is bound to")
    }
  }
```
