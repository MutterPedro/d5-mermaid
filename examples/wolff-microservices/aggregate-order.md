# Order Aggregate (aggregate view)

Source: Eberhard Wolff, *Microservices*, the Order service. The "copy the data you need"
principle shows up here as invariants: product name, unit price and shipping address are
snapshotted at checkout and never re-read.

```d5
d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(order_line, "Order Line")
    ValueObject(order_id, "Order ID")
    ValueObject(customer_id, "Customer ID")
    ValueObject(shipping_address, "Shipping Address")
    ValueObject(product_id, "Product ID")
    ValueObject(product_name, "Product Name")
    ValueObject(unit_price, "Unit Price")
    ValueObject(quantity, "Quantity")
    ValueObject(order_status, "Order Status")

    Invariants {
      Invariant("An order has at least one order line")
      Invariant("Product name and unit price are copied from the catalog at checkout and never re-read afterwards")
      Invariant("The shipping address is copied from the customer record at checkout, so a later address change does not move existing orders")
      Invariant("Status", "Open → Placed → Completed; the order is published to delivery and billing only once it is Placed")
      Invariant("The order total is the sum of quantity × unit price over all lines")
    }
  }
```
