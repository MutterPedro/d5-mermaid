# Lending Context — Tactical Structure (context view)

Source: [ddd-by-examples/library](https://github.com/ddd-by-examples/library),
`io.pillopl.library.lending`. The two aggregates with real logic are **Patron** and
**Book**; Library Branch is a small identity aggregate. **Patron Profile** and the
**Daily Sheet** are CQRS read models built from the Book/Patron events.

```d5
d5-context
  title Lending Context — Tactical Structure
  direction LR

  BoundedContext(lending_ctx, "Lending", team: "Lending Team") {

    Language {
      Term("Hold", "A patron's claim on an available book at a branch; blocks every other patron until the book is checked out, the hold is cancelled, or it expires")
      Term("Open-ended Hold", "A hold with no expiry date, active until the patron checks the book out; only a researcher patron may request one")
      Term("Closed-ended Hold", "A hold that expires a fixed number of days after it is requested if the book has not been checked out by then")
      Term("Checkout", "A patron's borrowing of a book for up to 60 days; it becomes an overdue checkout once that limit passes")
      Term("Available Book", "A catalogued book instance at a branch that no patron currently holds or has checked out")
      Term("Restricted Book", "A book that only a researcher patron is allowed to place on hold; a regular patron is always rejected")
      Term("Overdue Checkout", "A checkout that has not been returned more than 60 days after it began; counted per branch against the patron")
    }

    Aggregate(patron_agg, "Patron", root: "Patron", fields: "Patron Type, Patron Holds, Overdue Checkouts")
    Aggregate(book_agg, "Book", root: "Book", fields: "Book State, Book Type, Library Branch, Bound To Patron")
    Aggregate(branch_agg, "Library Branch", root: "Library Branch", fields: "Branch Code, Name")

    ReadModel(patron_profile, "Patron Profile")
    ReadModel(daily_sheet, "Expiring Holds Daily Sheet")

    Rel(patron_agg, book_agg, "places holds on & checks out books referenced by book id")
    Rel(book_agg, branch_agg, "is shelved at a branch referenced by branch id")
    Rel(patron_agg, branch_agg, "overdue-checkout limit is counted per branch id")

    Event(patron_agg, book_agg, "BookPlacedOnHold")
    Event(patron_agg, book_agg, "BookCheckedOut")
    Event(book_agg, patron_profile, "BookHoldExpired")
    Event(book_agg, patron_profile, "BookCheckedOut")
    Event(book_agg, daily_sheet, "BookPlacedOnHold")

    Policy(book_agg, patron_agg, "when a book is checked out, complete the patron's open-ended hold on it")
    Policy(daily_sheet, book_agg, "each day: expire any closed-ended hold on the sheet not yet checked out")
  }
```
