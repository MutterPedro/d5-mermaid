# SaaSOvation — Context Map (subdomain view)

Source: [VaughnVernon/IDDD_Samples](https://github.com/VaughnVernon/IDDD_Samples) —
`iddd_agilepm`, `iddd_collaboration`, `iddd_identityaccess`. Identity & Access is an Open
Host Service (RESTful + a notification log); Agile PM consumes both Identity & Access and
Collaboration through anti-corruption layers.

```d5
d5-subdomain
  title SaaSOvation — Context Map
  direction LR

  Subdomain(agile_pm, "Agile Project Management", core) {
    BoundedContext(agilepm_ctx, "Agile PM", team: "ProjectOvation Team")
  }

  Subdomain(collaboration, "Team Collaboration", supporting) {
    BoundedContext(collab_ctx, "Collaboration", team: "CollabOvation Team")
  }

  Subdomain(identity_access, "Identity & Access Management", generic) {
    BoundedContext(identity_ctx, "Identity & Access", team: "Platform / IAM Team")
  }

  Rel(identity_ctx, agilepm_ctx, "Open Host Service")
  Rel(identity_ctx, collab_ctx, "Open Host Service")
  Rel(collab_ctx, agilepm_ctx, "Customer-Supplier")
```
