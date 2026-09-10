# SaaSOvation — Domain view

Source: [VaughnVernon/IDDD_Samples](https://github.com/VaughnVernon/IDDD_Samples) — the
bounded contexts from *Implementing Domain-Driven Design*. SaaSOvation builds a SaaS suite:
**ProjectOvation** (agile project management, the core) and **CollabOvation** (team
collaboration), both sitting on a shared **Identity & Access** platform.

```d5
d5-domain
  title SaaSOvation — Domain
  direction LR

  Domain(saasovation, "SaaSOvation") {
    Subdomain(agile_pm, "Agile Project Management", core)
    Subdomain(collaboration, "Team Collaboration", supporting)
    Subdomain(identity_access, "Identity & Access Management", generic)
  }

  Rel(agile_pm, identity_access, "authenticates & authorizes users via")
  Rel(collaboration, identity_access, "authenticates & authorizes users via")
  Rel(agile_pm, collaboration, "embeds discussions & shared calendars from")
```
