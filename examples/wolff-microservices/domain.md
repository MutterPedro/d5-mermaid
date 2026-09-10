# Webshop — Domain view

Source: Eberhard Wolff, *Microservices — A Practical Guide* / the
[ewolff/microservice-kafka](https://github.com/ewolff/microservice-kafka) sample. A
deliberately lean webshop: an **Order** process that copies the product and customer data it
needs onto an order message, which Delivery and Billing then consume independently — no
shared model, no runtime coupling back to Order.

```d5
d5-domain
  title Webshop — Domain
  direction LR

  Domain(webshop, "Webshop") {
    Subdomain(order, "Order Process", core)
    Subdomain(catalog, "Product Catalog", supporting)
    Subdomain(customer, "Customer Management", supporting)
    Subdomain(delivery, "Delivery", supporting)
    Subdomain(billing, "Billing & Invoicing", supporting)
  }

  Rel(order, catalog, "takes product data & prices from")
  Rel(order, customer, "takes the customer & shipping address from")
  Rel(delivery, order, "delivers the goods for an")
  Rel(billing, order, "bills the customer for an")
  Rel(billing, customer, "reads the billing address from")
```
