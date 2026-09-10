# Order Aggregate (aggregate view)

Source: [dotnet-architecture/eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers),
`Ordering.Domain.AggregatesModel.OrderAggregate`. The canonical MS DDD aggregate: an Order
root with OrderItem entities, an Address value object and a status enumeration.

```d5
d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(order_item, "Order Item")
    ValueObject(order_id, "Order ID")
    ValueObject(address, "Address")
    ValueObject(order_status, "Order Status")
    ValueObject(buyer_id, "Buyer ID")
    ValueObject(payment_method_id, "Payment Method ID")
    ValueObject(unit_price, "Unit Price")
    ValueObject(discount, "Discount")

    Invariants {
      Invariant("An order always has at least one order item")
      Invariant("Status", "Status only advances Submitted → AwaitingValidation → StockConfirmed → Paid → Shipped; it may be Cancelled only from a non-final status")
      Invariant("An order item's unit price is captured when the order is placed and is never re-read from the catalog afterwards")
      Invariant("Adding a product already on the order merges into its existing item — quantities sum and the higher discount wins")
      Invariant("The order total is the sum over items of (unit price − discount) × units")
    }
  }
```
