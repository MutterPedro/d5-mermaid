# Public Library — Domain view

Source: [ddd-by-examples/library](https://github.com/ddd-by-examples/library) — a public
library where patrons place books on hold at branches and check them out. **Book
Circulation** (lending) is the one subdomain with real business logic; the *daily sheet*
and *patron profile* are read models of that context, not subdomains, so they appear in the
`d5-context` view rather than here.

```d5
d5-domain
  title Public Library — Domain
  direction LR

  Domain(library, "Public Library") {
    Subdomain(lending, "Book Circulation", core)
    Subdomain(catalogue, "Book Catalogue", supporting)
    Subdomain(branch, "Library Branches", generic)
  }

  Rel(lending, catalogue, "gets available book instances from")
  Rel(lending, branch, "scopes holds & checkouts by branch in")
  Rel(catalogue, branch, "assigns book instances to branches in")
```
