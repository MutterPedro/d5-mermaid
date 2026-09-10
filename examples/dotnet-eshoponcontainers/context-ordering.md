# Ordering Context — Tactical Structure (context view)

Source: [dotnet-architecture/eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers),
`Ordering.Domain`. Two aggregates — **Order** and **Buyer** — plus the CQRS query side.
The ordering process is driven by domain events and reactive policies between them.

```d5
d5-context
  title Ordering Context — Tactical Structure
  direction LR

  BoundedContext(ordering_ctx, "Ordering", team: "Ordering Team") {

    Language {
      Term("Order", "A customer's confirmed purchase — a set of order items with a shipping address — moving through a fixed status workflow")
      Term("Order Item", "One product line on an order: the product id, the unit price captured at order time, the quantity and any discount")
      Term("Buyer", "The party placing orders, identified by their identity-service GUID; owns the payment methods an order can be charged against")
      Term("Payment Method", "A card a buyer has registered — alias, last digits, expiry and card type — usable to pay an order")
      Term("Order Status", "Submitted → AwaitingValidation → StockConfirmed → Paid → Shipped; Cancelled is reachable from any non-final status")
      Term("Card Type", "The scheme of a payment method: Amex, Visa or MasterCard")
    }

    Aggregate(order_agg, "Order", root: "Order", fields: "Buyer Id, Address, Order Status, Order Items, Payment Method Id")
    Aggregate(buyer_agg, "Buyer", root: "Buyer", fields: "Identity GUID, Name, Payment Methods")

    ReadModel(order_queries, "My Orders / Order Detail")

    Rel(order_agg, buyer_agg, "references its buyer & chosen payment method by id")

    Event(order_agg, buyer_agg, "OrderStarted")
    Event(buyer_agg, order_agg, "BuyerAndPaymentMethodVerified")
    Event(order_agg, order_queries, "OrderStatusChanged")

    Policy(order_agg, buyer_agg, "when an order is started, verify (or register) the buyer and the selected payment method")
    Policy(order_agg, order_agg, "when stock is confirmed for every order item, advance the order to StockConfirmed and request payment")
  }
```
