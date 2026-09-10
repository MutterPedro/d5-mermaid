# Invoice Aggregate (aggregate view)

Source: Eberhard Wolff, *Microservices*, the Billing service. It builds an invoice purely
from the `OrderPlaced` message — no callback to Order — and is idempotent on that message.

```d5
d5-aggregate
  title Invoice Aggregate

  Aggregate(invoice_agg, "Invoice", root: "Invoice") {
    Entity(invoice, "Invoice")
    Entity(invoice_line, "Invoice Line")
    ValueObject(invoice_id, "Invoice ID")
    ValueObject(order_id, "Order ID")
    ValueObject(customer_id, "Customer ID")
    ValueObject(billing_address, "Billing Address")
    ValueObject(line_amount, "Line Amount")
    ValueObject(total, "Total")
    ValueObject(invoice_status, "Invoice Status")

    Invariants {
      Invariant("An invoice is created from exactly one placed order, referenced by order id")
      Invariant("Line amounts and the billing address are copied from the order message — a later price or address change elsewhere never alters a sent invoice")
      Invariant("The invoice total equals the sum of its line amounts")
      Invariant("Consuming the same OrderPlaced message twice does not produce a second invoice")
    }
  }
```
