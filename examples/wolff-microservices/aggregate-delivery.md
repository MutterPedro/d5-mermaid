# Delivery Aggregate (aggregate view)

Source: Eberhard Wolff, *Microservices*, the Delivery / Shipping service. Like Billing it
consumes the `OrderPlaced` message and holds its own copy of everything it needs.

```d5
d5-aggregate
  title Delivery Aggregate

  Aggregate(delivery_agg, "Delivery", root: "Delivery") {
    Entity(delivery, "Delivery")
    ValueObject(delivery_id, "Delivery ID")
    ValueObject(order_id, "Order ID")
    ValueObject(delivery_address, "Delivery Address")
    ValueObject(shipped_item, "Shipped Item")
    ValueObject(delivery_status, "Delivery Status")
    ValueObject(tracking_code, "Tracking Code")

    Invariants {
      Invariant("A delivery is created from exactly one placed order, referenced by order id")
      Invariant("The delivery address and the item list are copied from the order message at creation time")
      Invariant("A delivery is dispatched only once every ordered item is in stock at the warehouse")
      Invariant("Consuming the same OrderPlaced message twice does not produce a second delivery")
    }
  }
```
