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

    Has(order, order_id, one, as: "identity")
    Has(order, order_item, at_least_one, as: "items")
    Has(order, address, one, as: "ships to")
    Has(order, order_status, one, as: "status")
    Has(order, buyer_id, optional, as: "buyer")
    Has(order, payment_method_id, optional, as: "paid with")
    Has(order_item, unit_price, one)
    Has(order_item, discount, one)

    Ref(buyer_id, buyer_agg)
    Ref(payment_method_id, buyer_agg, as: "one of its payment methods")
    Ref(order_item, catalog_item_agg, as: "product")

    Command(create_order, "Create Order")
    Command(await_validation, "Set Awaiting Validation")
    Command(confirm_stock, "Confirm Stock")
    Command(pay, "Set Paid")
    Command(ship, "Ship Order")
    Command(cancel, "Cancel Order")

    Event(order_started, "OrderStarted")
    Event(awaiting_validation, "OrderStatusChangedToAwaitingValidation")
    Event(stock_confirmed, "OrderStatusChangedToStockConfirmed")
    Event(paid, "OrderStatusChangedToPaid")
    Event(shipped, "OrderShipped")
    Event(cancelled, "OrderCancelled")

    Emits(create_order, order_started)
    Emits(await_validation, awaiting_validation)
    Emits(confirm_stock, stock_confirmed)
    Emits(pay, paid)
    Emits(ship, shipped)
    Emits(cancel, cancelled)

    Lifecycle {
      State(s_submitted, "Submitted")
      State(s_awaiting, "Awaiting Validation")
      State(s_confirmed, "Stock Confirmed")
      State(s_paid, "Paid")
      State(s_shipped, "Shipped")
      State(s_cancelled, "Cancelled")

      Transition(s_submitted, s_awaiting, on: await_validation)
      Transition(s_awaiting, s_confirmed, on: confirm_stock)
      Transition(s_confirmed, s_paid, on: pay)
      Transition(s_paid, s_shipped, on: ship)
      Transition(s_submitted, s_cancelled, on: cancel)
      Transition(s_awaiting, s_cancelled, on: cancel)
      Transition(s_confirmed, s_cancelled, on: cancel)
    }

    Invariants {
      Invariant("An order always has at least one order item")
      Invariant("An order item's unit price is captured when the order is placed and is never re-read from the catalog afterwards")
      Invariant("Adding a product already on the order merges into its existing item — quantities sum and the higher discount wins")
      Invariant("The order total is the sum over items of (unit price − discount) × units")
    }
  }

  Aggregate(buyer_agg, "Buyer", root: "Buyer")
  Aggregate(catalog_item_agg, "Catalog Item", root: "Catalog Item")
```
