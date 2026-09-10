# Fashion Retailer — Domain view

Source: strategic domain modelling in the style of Nick Tune's
[Core Domain Charts](https://medium.com/nick-tune-tech-strategy-blog/core-domain-charts-968a1db35d1b).
An online fashion retailer whose competitive edge is its **dynamic pricing** and
**personalised recommendations**; everything else is table stakes it buys or builds simply.

> A `d5-domain` view classifies each subdomain as core / supporting / generic. A Core
> Domain Chart goes further and *positions* each one by business differentiation and model
> complexity — see FINDINGS (example 6) for the gap and a proposal.

```d5
d5-domain
  title Fashion Retailer — Domain
  direction LR

  Domain(retailer, "Fashion Retailer") {
    Subdomain(pricing, "Dynamic Pricing & Promotions", core)
    Subdomain(recommendations, "Personalised Recommendations", core)
    Subdomain(inventory, "Inventory & Availability", supporting)
    Subdomain(catalog, "Product Catalogue", supporting)
    Subdomain(checkout, "Checkout & Cart", supporting)
    Subdomain(fulfilment, "Order Fulfilment", supporting)
    Subdomain(payments, "Payments", generic)
    Subdomain(identity, "Customer Identity", generic)
  }

  Rel(checkout, pricing, "gets live prices & promotions from")
  Rel(checkout, recommendations, "shows suggested products from")
  Rel(checkout, inventory, "reserves stock via")
  Rel(checkout, payments, "authorises payment through")
  Rel(checkout, identity, "identifies the shopper via")
  Rel(pricing, inventory, "reads stock levels for markdown rules from")
  Rel(recommendations, catalog, "builds its model from product data in")
  Rel(fulfilment, checkout, "fulfils orders placed at")
  Rel(fulfilment, inventory, "allocates stock in")
```
