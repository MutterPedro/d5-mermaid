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

    Has(book, book_id, as: "identity")
    Has(book, book_state, as: "state")
    Has(book, book_type, as: "type")
    Has(book, bound_to_patron, optional, as: "held or borrowed by")
    Has(book, hold_placed_at, optional)
    Has(book, library_branch, as: "shelved at")

    Ref(bound_to_patron, patron_agg)
    Ref(library_branch, branch_agg)

    Command(place_on_hold, "Place On Hold")
    Command(cancel_hold, "Cancel Hold")
    Command(expire_hold, "Expire Hold")
    Command(check_out, "Check Out")
    Command(return_book, "Return")

    Event(placed_on_hold, "BookPlacedOnHold")
    Event(hold_cancelled, "BookHoldCanceled")
    Event(hold_expired, "BookHoldExpired")
    Event(checked_out, "BookCheckedOut")
    Event(returned, "BookReturned")

    Emits(place_on_hold, placed_on_hold)
    Emits(cancel_hold, hold_cancelled)
    Emits(expire_hold, hold_expired)
    Emits(check_out, checked_out)
    Emits(return_book, returned)

    Lifecycle {
      State(s_available, "Available")
      State(s_on_hold, "On Hold")
      State(s_checked_out, "Checked Out")

      Transition(s_available, s_on_hold, on: place_on_hold)
      Transition(s_on_hold, s_checked_out, on: check_out)
      Transition(s_on_hold, s_available, on: cancel_hold)
      Transition(s_on_hold, s_available, on: expire_hold)
      Transition(s_checked_out, s_available, on: return_book)
    }

    Invariants {
      Invariant("A book is in exactly one state at a time: Available, On Hold, or Checked Out")
      Invariant("An available book can be placed on hold by at most one patron")
      Invariant("A book that is On Hold or Checked Out always records the patron and the branch it is bound to")
    }
  }

  Aggregate(patron_agg, "Patron", root: "Patron")
  Aggregate(branch_agg, "Library Branch", root: "Library Branch")
```
