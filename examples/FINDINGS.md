# D5 Mermaid — Rendering Findings

Living document. Built by modelling real-world DDD examples with the plugin, rendering them
via `examples/gallery.html` against the local `dist/` build, and recording layout defects +
syntax opportunities. One example at a time.

Severity: **S1** blocking (unreadable / clipped content) · **S2** major (overlap, wasted space,
misleading) · **S3** polish.

---

## Example 1 — citerus/dddsample-core (Cargo Shipping)

Models: `examples/dddsample-core/` — `domain.md`, `subdomain.md`, `context-booking.md`,
`aggregate-cargo.md`, `aggregate-handling-event.md`, `aggregate-voyage.md`.

**Models hardened (2026-09-07)** to stress the renderer further: domain now 8 subdomains /
12 rels with sentence-length labels; context map 11 bounded contexts / 8 subdomains /
15 rels with full DDD pattern names ("Anti-Corruption Layer", "Open Host Service",
"Published Language"); Booking context 5 aggregates with 6 long ubiquitous-language
definitions; Cargo aggregate 11 value objects; all three aggregates carry an `Invariants`
block. Post-hardening viewBoxes (Phase 1 build): domain 1654×769, subdomain 1804×831,
context 1170×858, cargo-aggregate **2370**×572, handling-event 1220×538, voyage 760×506.

**`Invariants` syntax — implemented (d5-aggregate).** `Invariants { Invariant("rule") |
Invariant("Subject", "rule") }` inside an `Aggregate`. Parser + db + renderer done; spec
§4.7.4 + §4.8 updated; changelog "Unreleased" (no version bump per plan). Renders as an
amber band inside the aggregate boundary, headed "Invariants — enforced by root: «Root»",
prose wrapped to a ≤620px column. Fills the previously-dead bottom strip of the aggregate
box (partly addresses A1/A4 when invariants are present).

### 1a. `d5-context` — Booking Context  → worst offender

| # | Sev | Finding |
|---|-----|---------|
| C1 | ~~S1~~ ✅ Phase 3 | Term names **and** definitions are now `wrapText`-ed to a 300px column; `noteH` is summed from real wrapped line counts. Nothing clips; nothing crosses the BC border. |
| C2 | ~~S1~~ ✅ Phase 3 | Sidebar width is derived (`NOTE_TEXT_W + 2·NOTE_PAD`), header height a named constant, and the yellow header tab tracks it. |
| C3 | ~~S2~~ ✅ Phase 1 | Relationship label pills sized to text via `createEdgeLabel` (long ones wrap). |
| C4 | ~~S2~~ ✅ Phase 3 (mitigated) | Still a right-hand **sidebar** (spec §7.3 wants that), but the aggregate grid is vertically centred against the sidebar when the sidebar is the taller side (`gridYOffset`), removing the old dead quadrant. |
| C5 | ~~S3~~ ✅ Phase 3 | `TITLE_HEIGHT` trimmed 40 → 34. |
| C6 | ~~S3~~ ✅ | Aggregate `fields:` was real in the parser/renderer but absent from `D5-SPEC.md`. **Fixed in spec 0.2.0-draft** (§4.7.3 + §4.8 EBNF + changelog). |

### 1b. `d5-subdomain` — Context Map

| # | Sev | Finding |
|---|-----|---------|
| S1 | ~~S1~~ ✅ Phase 1+4 | Pills sized to text (Phase 1); LR flow + `edgesep 30` (Phase 4) spreads them along the horizontal edges. No more collision stack. |
| S2 | ~~S2~~ ⚠️ Phase 4 (partial) | `acyclicer: 'greedy'` + wider `ranksep`/`edgesep` + the new **author-controlled `direction`** (default `LR`, the context-map convention) cut most cluster crossings. Authors pick the flow that suits their model — for dddsample, `LR` → 1807×1298, `TD` → 2117×905. **Residual**: a few long edges still cross a sibling cluster (Dagre routes around on-rank nodes, not sibling clusters). Full fix = ELK — see decision note. |
| S3 | ~~S2~~ ✅ Phase 4 | LR flow routes edges into cluster sides, not the top title band; arrowheads land on the BC ellipses. |
| S4 | ~~S2~~ ✅ Phase 1+4 | Pills sit on `edge.x/edge.y` (Dagre's label-node centre) and, with the LR spread, each pill is unambiguously on its own edge. |
| S5 | ~~S3~~ ✅ Phase 2 | BC ellipse `rx`/`ry` now computed from the wrapped label + team line ("External Graph Traversal Service" wraps and fits). Subdomain clusters widen (`paddingLeft/Right`) so a long subdomain title cannot overflow the cluster. |
| S6 | ~~S3~~ ✅ Phase 2 | Team line laid out within the measured ellipse height; no longer cramped. |

### 1c. `d5-domain` — Domain view

| # | Sev | Finding |
|---|-----|---------|
| D1 | ~~S1~~ ✅ Phase 1 | Rel-label pills sized to text via `createEdgeLabel`; long ones wrap. |
| D2 | ~~S2~~ ✅ Phase 4 | `nodesep 74` / `edgesep 28` + `acyclicer: 'greedy'` spread the left-gutter edges; the pile-up behind the "depends on" pills is gone. |
| D3 | ~~S2~~ ✅ Phase 2+4 | 690×816 portrait ribbon → 1252×923. Boxes measured (Phase 2); separations retuned (Phase 4). Depth is now the graph's real 5 ranks, not layout waste. |
| D4 | ~~S2~~ ✅ Phase 4 | Edges that run against the rank flow (target above source) render dashed + light grey with class `d5-rel-back` — reads as a feedback dependency. |
| D5 | S3 | "Core should stand out most" (spec §2.1 visual guidance) — currently core is just a blue fill, same weight as the others. No emphasis / size / border treatment. **Backlog (new syntax).** |
| D6 | S3 | Legend swatch `<text>` sits 20px right of a 14px swatch — my overflow probe flags it; harmless but shows the probe and the renderer disagree on "inside the box". |
| D7 | ~~S2~~ ✅ Phase 2 | Subdomain box width now measured from its label (clamped 180–320px), fed to Dagre. Long subdomain names ("Cargo Handling & Event Capture") fit on one line; canvas is landscape again (1654×769 → 1792×769). |

### 1c′. `d5-context` — aggregate boxes

| # | Sev | Finding |
|---|-----|---------|
| CA1 | ~~S2~~ ✅ Phase 2 | Aggregate box width now `max(180, label, "Root: …", widest field)` clamped to 340, fed to Dagre. Field lists ("Route Specification", "Clearance Point") no longer clip. |
| CA2 | S3 (pre-existing) | `d5-context` with `Language` terms but **zero aggregates** produces `x="-Infinity"` / `width="-Infinity"` (visible in the "context with only ubiquitous language terms" snapshot). `graphW` is 0 and a `Math.max`/reduce over an empty set leaks through. Not hit by any example model; noted for the cleanup pass. |

### 1d. `d5-aggregate` — Cargo / Handling Event / Voyage  → healthiest

| # | Sev | Finding |
|---|-----|---------|
| A1 | ~~S1~~ ✅ Phase 2 | Aggregate renderer rebuilt: root is a full-width head card, members lay out in a **column-count grid** sized to `TARGET_GRID_W` (11 VOs → 4×3). Cargo aggregate viewBox 2370×572 → **950×748**. Dagre dropped from this renderer (no graph needed); auto root→member arrows removed (spec §2.4). |
| A2 | ~~S1~~ ✅ Phase 2 | Grid cells sized to the widest measured label (clamped 150–240px), long labels wrap to 2 lines. "Estimated Time of Arrival" / "Next Expected Handling Activity" / "Location (UN/LOCODE)" no longer clip. |
| A3 | ~~S3~~ ✅ Phase 2 | Auto root→member edges removed — matches spec §2.4 ("no relationship lines in the aggregate view"). |
| A4 | ~~S3~~ ✅ Phase 2 (mostly) | Grid + invariants band fill the box; residual top gap is the `AGG_HEADER` band only. |

### Cross-cutting (seen on ≥2 diagram types)

1. ~~No text measurement anywhere.~~ ✅ **Phase 1** — `src/shared/text.ts`
   (`measureText` canvas-or-estimator, `wrapText`, `lineHeight`) + `src/shared/shape.ts`
   (`boxWidth`, `ellipseRx`, `gridDimensions`). Every renderer now sizes shapes to text.
2. ~~Relationship label rendering duplicated 4×.~~ ✅ **Phase 1** — one
   `src/shared/edge-label.ts` `createEdgeLabel()` / `edgeLabelSize()`, used by domain /
   subdomain / context; the pill is sized (and wrapped) to the text and its size is fed to
   Dagre so the layout reserves space for it.
3. **Edge routing ignores sibling clusters.** ⚠️ **Phase 4 partial.** Dagre `LR` +
   `acyclicer: greedy` + wider `ranksep`/`edgesep` removed the collisions and most
   crossings, but Dagre still routes only around on-rank nodes, so a long edge can clip a
   sibling cluster on the `d5-subdomain` map. **Decision pending** (see below).
4. **Fixed top dead space** (`TITLE_HEIGHT` + `*_HEADER` + padding). Trimmed on context
   (Phase 3); still present on domain / subdomain / aggregate. S3.
5. ~~Canvas aspect ratio is whatever `rankdir: TB` produces.~~ ✅ **Phase 4** — `d5-domain`
   separations retuned; `d5-subdomain` switched to `LR` (context-map convention).
6. ~~Spec ↔ implementation drift (`fields:`).~~ ✅ spec 0.2.0-draft.

### Phase 4 decision — Dagre vs ELK

Dagre tuning (Phases 1–4) cleared every **S1** and all but one **S2**. The single residual
is edge routing around sibling clusters on the `d5-subdomain` context map: a handful of
long relationship edges still pass over a cluster they don't belong to. Dagre has no
obstacle-aware edge router. `elkjs` (`layered`, `edgeRouting: ORTHOGONAL`,
`hierarchyHandling: INCLUDE_CHILDREN`) does route around clusters, but the swap makes
`render()` async, adds ~1.5 MB, and rewrites the layout half of the subdomain/domain
renderers.

**Chosen for now (per user):** instead of the ELK swap, `d5-subdomain` gained an
author-controlled `direction` line (`LR` default / `RL` / `TB` / `TD` / `BT`) so the model
author picks the flow that reads best for their context map. ELK stays a candidate to
revisit if a later example's map is still unacceptable, or as a dedicated follow-up.

### Syntax / spec opportunities (for the consolidated proposal)

- **Emphasis / centrality** — a way to mark the component a diagram is *about*
  (e.g. `core` subdomain, the BC in focus, an aggregate root) so the renderer can center
  it, enlarge it, or ring it. Candidate: `Subdomain(id, "…", core, emphasis)` positional
  flag, or a `Style(id, …)` line, or `!` prefix. Aligns with spec §2.1 / §7.3.
- ~~**Relationship pattern → visual encoding** + **upstream/downstream markers**~~
  ✅ **prototyped (spec 0.3.0-draft, §4.7.2).** `src/shared/context-relationship.ts`
  `classifyRelationship()` matches the 9 Evans patterns (case / spacing / abbreviation
  insensitive). `d5-subdomain` renders a matched pattern as a compact badge (`ACL`, `OHS`,
  `PL`, `CF`, `C/S`, `SK`, `P`) + `U`/`D` (or `S`/`C`) endpoint markers + decoration:
  ACL gate near the downstream end, OHS socket near the upstream end, symmetric
  no-arrowhead lines for Partnership (heavy) / Shared Kernel (doubled), dashed for
  Separate Ways. A used-patterns legend is drawn under the type legend. Free-text labels
  still fall back to the wrapped pill. `source` = upstream, `target` = downstream.
- **Explicit `fields:` in the spec** for `d5-context` aggregates (or drop it) — resolve
  the drift, and consider the same for a short entity/VO list at context zoom.
- **`external` flag** for a `BoundedContext` (the Graph Traversal Service) so third-party
  systems render distinctly (grey, dashed) — common on real context maps.
- ~~Per-diagram `direction` hint~~ ✅ **`d5-subdomain` (default LR) + `d5-domain` /
  `d5-context` (default TB)** — `LR` / `RL` / `TB` / `TD` / `BT` (spec 0.3.0-draft
  §4.7.1–4.7.3).
- **Note/Language placement hint** (`below` / `right` / `floating`) — spec §2.3 already
  says the language block "shouldn't be rendered inline… tooltip or sidebar"; today it's a
  fixed right-hand column.

### Notation coverage — gaps found modelling examples 1–3

Modelling three real systems (all discovered via Event Storming) surfaced things the
notation could not hold. The spec's exclusions (repositories, factories, application
services — §6.1) are **right** and stay out. The genuine gaps, priority order:

| # | Gap | Status |
|---|-----|--------|
| G1 | **Context-map relationship encoding + U/D roles.** Every context edge was an identical grey arrow + prose pill; the 9 Evans patterns carry standardised asymmetric semantics. | ✅ **prototyped** — spec 0.3.0-draft §4.7.2 (`classifyRelationship`, badges, roles, ACL gate, OHS socket, symmetric lines, pattern legend). |
| G2 | **Domain events / async integration.** All three repos integrate via published events; the semantics kept leaking into free-text labels ("streams … events to", "projects … from"). No way to say an integration is event-carried. | ✅ **prototyped** — `Event(src, tgt, "Name")` in `d5-context` (spec 0.3.0-draft §4.7.3): dashed amber arrow + Event Storming tag, coexists with a structural `Rel`, multiple per pair allowed. |
| G3 | **Policies / reactions.** "*When* X, *do* Y" — distinct from an `Invariant` ("X is always true here"). library's `PlacingOnHoldPolicy` family; time-triggered rules ("a closed-ended hold expires N days later"). | ✅ **prototyped** — `Policy(source, target, "whenever … then …")` in `d5-context` (spec 0.3.0-draft §4.7.3): dashed **violet** arrow + wrapped policy tag (Event Storming's purple sticky); `source === target` for a scheduled / self-directed policy (renders as a self-loop); coexists with `Rel` + `Event`. |
| G4 | **Read models / projections.** dddsample tracking view, library daily sheet + patron profile, IDDD CQRS projections — miscast as "supporting subdomains". | ✅ **prototyped** — `ReadModel(id, "Label")` in `d5-context` (spec 0.3.0-draft §4.7.3): a table-shaped node with no aggregate root, fed by `Event(aggregate, read_model, "…")` edges. Library's Lending context now shows *Patron Profile* + *Expiring Holds Daily Sheet* as read models where they belong. The library `d5-domain` / `d5-subdomain` views had them as **fake subdomains**; those were removed (2026-09-09), leaving a clean 3-node strategic map (Book Circulation / Book Catalogue / Library Branches). Read models are a tactical concern and stay out of the strategic views entirely — no strategic-level tag needed. |
| G5 | **Inter-aggregate multiplicity in `d5-context`** (`1` / `*` / `0..1` on the by-id `Rel`) — encoded in prose today; a compact crow's-foot / numeric marker would be precise. | backlog |

Domain services: stay excluded, but note the tension — a *domain* service that is part of
the ubiquitous language (dddsample's `RoutingService`) is genuine vocabulary, not plumbing.
Low priority; revisit only if it recurs.

#### Invariants (proposed — for discussion)

D5 today shows an aggregate's *parts* but never *why it is a consistency boundary*. The
spec leans on this idea (§2.3 "what are the consistency boundaries within this context",
§2.4 "what is its consistency boundary?", §6.3 root as a "forcing function") but gives it
no notation. Proposal:

- **`Invariants { ... }` block inside an `Aggregate`**, mirroring `Language { Term(...) }`
  inside a `BoundedContext`. Two forms:
  - `Invariant("free-text rule")`
  - `Invariant("Short name", "Full statement")` — name + detail, mirroring `Term`
- Valid in **`d5-aggregate`** (primary) and **`d5-context`** (compact).
- Rendering:
  - `d5-aggregate`: a distinct "Invariants — enforced by root: «Root»" section banded
    inside the aggregate boundary (shield/checklist styling). Makes the boundary concrete.
  - `d5-context`: a small badge on the aggregate box (e.g. "⛨ 3") with the list available
    on hover / in a side panel — keeps the context zoom uncluttered (§2.3 philosophy).
- Additive, non-breaking. Parser pattern already exists (`Language`/`Term`).
- Deferred extensions: `refs:` to link an invariant to specific members; a `@root`-scoped
  sub-block; severity/kind (`invariant` vs `precondition`).
- Naming: DDD term of art is **invariant** (not "rule"/"constraint").

Open question for the consolidated proposal: should a *context-map* (`d5-subdomain`) or
*domain* view ever surface invariants, or is that strictly a tactical (zoom 3–4) concern?
(Leaning: strictly tactical.)

### Revised workflow (per user, 2026-09-06)

Fixes are applied **per example** — renderer changes + spec updates + snapshot/regression
tests all land and are approved for example _N_ before example _N+1_ is modelled. The
spec's minor version was bumped to **0.2.0-draft** for the `fields:` documentation fix; it
will bump again once the new syntax from this backlog (emphasis, pattern encoding,
invariants, `external`, direction hint, placement hint) is designed and implemented.

### Snapshot / regression guard — ✅ done

- **`tests/examples.render.test.ts`** — for every `examples/dddsample-core/*.md`: extract
  the D5 block, render through the real parse → render path (jsdom), and assert
  1. no centred `<text>` overflows its owning shape (uses the same headless `measureText`
     the renderers size with — self-consistent; legend / invariants band / language note /
     left-anchored labels are excluded);
  2. `viewBox` present, each side in `(80, 6000)`;
  3. `toMatchSnapshot()` on the serialised SVG.
- All 15 pre-existing renderer snapshots regenerated to capture the Phase 1–4 output;
  6 new per-example snapshots written. Full suite: **112 passing**, `tsc` clean.
- `src/shared/text.ts` skips jsdom's canvas (keeps the estimator path deterministic and
  quiet in CI).

---

## Example 2 — ddd-by-examples/library (Public Library)

Models: `examples/ddd-by-examples-library/` — `domain.md`, `subdomain.md`,
`context-lending.md`, `aggregate-patron.md`, `aggregate-book.md`,
`aggregate-library-branch.md`. Book lending: patrons place holds at branches and check
books out; **Lending** is the one context with real logic (the place-on-hold policies),
everything else is supporting / generic / a read model. viewBoxes: domain 557×776,
subdomain 1674×501, context 873×812, patron-aggregate 983×614, book-aggregate 938×589,
branch-aggregate 436×447.

**The Phase 1–4 work generalised cleanly** — a second, unrelated real model renders with
no S1/S2 regressions: no text overflow anywhere, LR context map reads clean, Ubiquitous
Language sidebar wraps and fits, aggregate grids + invariants bands lay out well. The
place-on-hold policies map almost 1:1 onto `Invariant(...)` lines — a strong showcase.

### New / confirmed findings

| # | Sev | Finding |
|---|-----|---------|
| L1 | ~~S3~~ ✅ | **`direction` extended to `d5-domain` and `d5-context`** (default `TB` for both; `d5-subdomain` keeps `LR`). Shared `src/shared/direction.ts` (`normalizeDirection`, `DIRECTION_RE`); all three dbs/parsers use it. Library domain with `direction LR` → 557×776 portrait becomes **1533×412**. Spec §4.7.1–4.7.3 + EBNF + changelog updated. Parser tests added for domain + subdomain. |
| L2 | S3 | **Partial last grid row is left-aligned.** Patron aggregate has 6 value objects → 5 + 1; the lone 6th cell sits at the left of row 2 rather than centred under the row above. Cosmetic. |
| L3 | — | Confirms **D5** (core subdomain not visually emphasised) on a second model — "Book Circulation" core looks the same weight as the supporting subdomains. Backlog (new syntax). |
| L4 | ✅ | `direction LR` on the context map works on a fresh model; edges enter cluster sides, arrowheads on ellipses, one mild edge-clips-cluster residual (S2, as expected). |

---

## Example 3 — VaughnVernon/IDDD_Samples (SaaSOvation)

Models: `examples/vernon-iddd-samples/` — `domain.md`, `subdomain.md`,
`context-agile-pm.md`, `aggregate-backlog-item.md`, `aggregate-product.md`,
`aggregate-sprint.md`. The *Implementing DDD* contexts: **Agile PM** (core, ProjectOvation),
**Collaboration** (supporting), **Identity & Access** (generic, an Open Host Service). All
three view types authored `direction LR`. viewBoxes: domain 1209×365, subdomain 1252×357,
context 1860×670, backlog-item-aggregate 1033×614, product 973×497, sprint 938×497.

**Third real model, still no S1/S2 regressions.** The `direction LR` fix from example 2
carries the domain + context views nicely (both landscape). LR context view and the
Ubiquitous Language sidebar coexist cleanly — verified 60px clearance between the
rightmost aggregate and the note. The Backlog Item aggregate's `Task` entity renders as a
square-cornered box against the rounded value-object pills — the entity/VO distinction
reads.

### New / confirmed findings

| # | Sev | Finding |
|---|-----|---------|
| V1 | ~~S2~~ ⚠️ (known) | On the LR context map the `Identity & Access → Agile PM` "Open Host Service" edge passes *under* the Collaboration cluster (below the box, not through the ellipse). Same Dagre no-cluster-routing limitation logged in the Phase 4 decision. Mild. |
| V2 | S3 | **Aggregate grid interleaves entities and value objects by declaration order.** Backlog Item's `Task` entity sits between value-object cells. Only the shape + type label separate them. Consider ordering entities first, or a subtle divider between the entity run and the value-object run. |
| V3 | — | Confirms **L2** (partial last grid row left-aligned — Backlog Item 8 members → 5 + 3) and **D5** (core subdomain "Agile PM" not emphasised) on a third model. |

---

## Example 4 — dotnet-architecture/eShopOnContainers (eShop)

Models: `examples/dotnet-eshoponcontainers/` — `domain.md`, `subdomain.md`,
`context-ordering.md`, `aggregate-order.md`, `aggregate-buyer.md`,
`aggregate-catalog-item.md`. A .NET microservices reference store: **Ordering** is the one
DDD/CQRS service, the rest are CRUD, all integrated through an event bus. viewBoxes: domain
1134×662, subdomain **1861×612**, context 1129×640, order-aggregate 978×646, buyer 938×564,
catalog-item 1028×564.

**Fourth real model, zero regressions.** The new 0.3.0-draft syntax pays off hard here:

- **Context map** — the pattern encoding makes a microservices map instantly readable:
  Identity is an `OHS` (with sockets), Catalog a `PL` publisher, Basket→Ordering→Payment a
  `C/S` chain, Marketing a `CF`. Legend lists the four used.
- **Ordering context view** — the most complete tactical picture in the set: 2 aggregates
  + 1 `ReadModel` ("My Orders / Order Detail") + 3 `Event`s + 2 `Policy`s (one a self-loop)
  + a 6-term UL sidebar, all coexisting legibly under `direction LR`.

### Confirmed findings (nothing new)

| # | Sev | Finding |
|---|-----|---------|
| E1 | ~~S2~~ ⚠️ (known) | One `Identity → Ordering` OHS edge passes under the Order Management cluster on the LR map. Same Dagre no-cluster-routing residual. Mild. |
| E2 | — | Re-confirms **L2** (Order aggregate: 9 members → 5 + 4, partial last row left-aligned), **V2** (entity `Order Item` interleaved with value objects), **D5** (core "Order Management" not emphasised). |
| E3 | S3 | Domain view is 1134×**662** — tallish for 6 subdomains even in LR, because Ordering is a hub wired to all five others. Not broken; `direction TD` might balance it better (author's call). |

---

## Example 5 — Wolff, *Microservices* (Webshop)

Models: `examples/wolff-microservices/` — `domain.md`, `subdomain.md`, `context-order.md`,
`aggregate-order.md`, `aggregate-invoice.md`, `aggregate-delivery.md`. Eberhard Wolff's
deliberately lean webshop (based on
[ewolff/microservice-kafka](https://github.com/ewolff/microservice-kafka)): Order copies
the catalog and customer data it needs onto an `OrderPlaced` message; Delivery and Billing
each build their own copy from it with no callback. viewBoxes: domain 1149×431, subdomain
1083×547, context 1417×496, order-aggregate 938×630, invoice 938×589, delivery 938×573.

**Fifth real model, zero regressions.** A useful contrast to eShop — smaller, pure
choreography.

- **Context map** — a compact hub map that reads at a glance with the pattern encoding:
  Order `CF`-conforms to Catalog, is the `C/S` customer of Customer, and `PL`-publishes to
  Delivery and Billing. The `U`/`D` and `S`/`C` role markers make every edge's direction
  unambiguous.
- **"Copy the data you need"** — Wolff's central architectural point renders naturally as
  `Invariant`s: *"Product name and unit price are copied from the catalog at checkout and
  never re-read"*, *"Consuming the same OrderPlaced message twice does not produce a second
  invoice"*. The same idempotency + snapshot invariants recur in all three aggregates.

### Confirmed findings (nothing new)

Re-confirms **L2** (Order aggregate 10 members → 5 + 5; the trailing run is full so it
happens to look centred here) and **D5** (core "Order Process" not emphasised). No new
issues; the `Event` / `Policy` / `ReadModel` / pattern-encoding syntax all behaved on a
fifth model.

---

## Example 6 — Nick Tune Core Domain Chart (Fashion Retailer)

Models: `examples/nick-tune-core-domain-chart/` — `domain.md`, `subdomain.md`,
`context-pricing.md`, `aggregate-price-rule.md`, `aggregate-promotion.md`. A strategic
model in the style of Nick Tune's
[Core Domain Charts](https://medium.com/nick-tune-tech-strategy-blog/core-domain-charts-968a1db35d1b):
an online fashion retailer whose edge is **dynamic pricing** and **personalised
recommendations**. viewBoxes: domain 1603×755, subdomain **1486×1097**, context 1497×612,
price-rule-aggregate 938×589, promotion 988×605.

### The representation gap (the point of this example)

`d5-domain` classifies each subdomain `core` / `supporting` / `generic` and colours it. A
**Core Domain Chart plots** each subdomain in a 2-D space — **business differentiation**
(y) × **model complexity** (x) — so you can see *how* core something is and spot
mis-investment (a "generic" thing sitting high-differentiation, a "core" thing that's
actually low-complexity). D5 cannot express that today. In the rendered `domain.md`,
*Dynamic Pricing* and *Personalised Recommendations* look identical in weight to the six
supporting/generic subdomains — only the fill colour differs.

**Proposal (backlog):** optional positioning attributes on `Subdomain` —
`Subdomain(pricing, "…", core, differentiation: high, complexity: high)` with
`low | medium | high` — plus a chart layout for `d5-domain` (`layout chart`, or a
`d5-domain-chart` variant) that draws the quadrant grid and positions subdomains by those
attributes instead of running Dagre. Default: infer from `type` (core → high/high,
supporting → medium, generic → low/low) so existing models get a usable chart for free.
This is complementary to — not a replacement for — the boxes-and-arrows domain map.

### Other findings

| # | Sev | Finding |
|---|-----|---------|
| N1 | **S2 (new)** | **Endpoint role-marker crowding at hub nodes.** On the context map *Checkout* has 6 relationships; their `U`/`D`/`S`/`C` circles pile up on its left edge and overlap. The markers are placed a fixed 16–20px in from each endpoint with no spread. Needs fan-out / offset when multiple edges share an endpoint. Fine at ≤3 edges (examples 1–5). |
| N2 | S3 | Hub-and-spoke topologies go tall under `direction LR` — the context map is 1486×**1097** because Dagre stacks the four middle-rank clusters. `direction TD` suits a hub better; author's call, but a hint in the docs would help. |
| N3 | — | A `Policy` whose `target` is a `ReadModel` ("when any price rule changes, recompute the effective price…") renders fine — reasonable for a projection-rebuild trigger. |


---

## Example 7 — ddd-by-examples/all-things-cqrs (Credit Card)

Models: `examples/all-things-cqrs/` — `domain.md`, `subdomain.md`,
`context-credit-card.md`, `aggregate-credit-card.md`. A deliberately tiny app
([ddd-by-examples/all-things-cqrs](https://github.com/ddd-by-examples/all-things-cqrs)) that
exists to show ways to sync a command side (a `CreditCard` in H2) with a query side
(withdrawals in MongoDB) — via trigger, log-tailing, application events, Kafka. viewBoxes:
domain **729×296**, subdomain **785×298**, context 1094×612, aggregate 938×589.

**Seventh model, zero regressions — and the cleanest CQRS demonstration in the set.** The
Credit Card context view *is* the reference shape: one write `Aggregate`, one `ReadModel`,
the `Event`s that carry the synchronisation (`CardWithdrawn`, `LimitAssigned`) and the two
`Policy`s (cycle rollover as a self-loop; the projection append). It reads like a textbook
CQRS diagram.

Also confirms D5 handles the **minimal** case well: the 2-box domain and 2-BC context maps
(729×296 / 785×298) render tidily, with the `PL` badge + `U`/`D` markers + legend all
legible at small size.

### Findings

Nothing new. No L2 (aggregate has only 6 members, one full row + a partial); the four
CQRS-syntax elements all behaved.

---

## Example pass — summary (examples 1–7)

Seven real DDD codebases / techniques modelled at every applicable zoom level — **39
diagrams**, all rendering error-free, all snapshot- and overflow-guarded in
`tests/examples.render.test.ts`.

**What the pass produced beyond the polish:** five additive syntax features, all shipped in
spec **0.3.0-draft** and exercised across multiple examples —

| feature | where | proven on |
|---|---|---|
| `Invariants { Invariant(...) }` | `d5-aggregate` | every aggregate view |
| `direction LR/RL/TB/TD/BT` | `d5-domain` / `d5-subdomain` / `d5-context` | examples 1–7 |
| context-map pattern encoding (badges, `U`/`D` roles, ACL gate, OHS socket, symmetric lines, legend) | `d5-subdomain` | examples 1, 3, 4, 5, 6 |
| `Event(source, target, "Name")` | `d5-context` | examples 1, 2, 3, 4, 5, 6, 7 |
| `Policy(source, target, "when … then …")` | `d5-context` | examples 1, 2, 3, 4, 5, 6, 7 |
| `ReadModel(id, "Label")` | `d5-context` | examples 1, 2, 3, 4, 5, 6, 7 |

**Open, not yet actioned:**

- **N1 (S2)** endpoint role-marker crowding when >3 edges meet one bounded context (example 6).
- **S2 residual** — a few long edges still clip a sibling cluster on dense context maps; ELK is the only full fix (Phase 4 decision).
- **L2 / V2 / D5 (S3)** — partial last grid row not centred; entities interleaved with value objects in the aggregate grid; core subdomain not visually emphasised.
- **G3–G5 backlog** — policies were prototyped (G3 ✅); read models prototyped (G4 ✅); inter-aggregate multiplicity (G5) still open.
- **Core Domain Chart** (example 6) — `d5-domain` classifies but does not *position* subdomains by differentiation × complexity; proposal recorded.
- **CA2** — pre-existing `-Infinity` when a `d5-context` has terms but zero aggregates.
