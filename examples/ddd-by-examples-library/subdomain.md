# Public Library — Context Map (subdomain view)

Source: [ddd-by-examples/library](https://github.com/ddd-by-examples/library). The repo's
package structure "screams" two bounded contexts — **catalogue** (CRUD) and **lending**
(hexagonal domain model) — plus **Library Branch** as shared reference data. The *patron
profile* and *daily sheet* read models live inside the Lending context (see the
`d5-context` view), not as contexts of their own.

```d5
d5-subdomain
  title Public Library — Context Map
  direction LR

  Subdomain(lending, "Book Circulation", core) {
    BoundedContext(lending_ctx, "Lending", team: "Lending Team")
  }

  Subdomain(catalogue, "Book Catalogue", supporting) {
    BoundedContext(catalogue_ctx, "Catalogue", team: "Catalogue Team")
  }

  Subdomain(branch, "Library Branches", generic) {
    BoundedContext(branch_ctx, "Library Branch", team: "Platform Team")
  }

  Rel(catalogue_ctx, lending_ctx, "Customer-Supplier")
  Rel(branch_ctx, lending_ctx, "Conformist")
  Rel(branch_ctx, catalogue_ctx, "Conformist")
```
