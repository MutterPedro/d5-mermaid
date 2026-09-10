# Order Context — Tactical Structure (context view)

Source: Eberhard Wolff, *Microservices*. The Order service turns a checked-out basket into
an order, **copying** current catalog prices and the customer's address onto it, then
publishes `OrderPlaced`. Deliberately lean — a Basket and an Order aggregate plus the query
side.

```d5
d5-context
  title Order Context — Tactical Structure
  direction LR

  BoundedContext(order_ctx, "Order", team: "Order Team") {

    Language {
      Term("Basket", "A customer's working set of items before checkout — quantities can still change and prices are shown live from the catalog")
      Term("Order", "A basket that has been checked out: its lines now carry copied product names and prices that will never change again")
      Term("Order Line", "One product on an order — product id, the product name and unit price copied at checkout, and a quantity")
      Term("Order Status", "Open → Placed → Completed; an order is published to delivery and billing only once it is Placed")
    }

    Aggregate(basket_agg, "Shopping Basket", root: "Basket", fields: "Customer, Basket Items")
    Aggregate(order_agg, "Order", root: "Order", fields: "Customer, Order Lines, Total, Status")

    ReadModel(order_overview, "Order Overview")

    Rel(order_agg, basket_agg, "an order is built from the customer's basket, which is then cleared")

    Event(basket_agg, order_agg, "BasketCheckedOut")
    Event(order_agg, order_overview, "OrderPlaced")

    Policy(basket_agg, order_agg, "when a basket is checked out, create an order from it, copying current catalog prices and the customer's shipping address")
  }
```
