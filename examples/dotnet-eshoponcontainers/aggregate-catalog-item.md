# Catalog Item Aggregate (aggregate view)

Source: [dotnet-architecture/eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers),
`Catalog.API.Model.CatalogItem`. The Catalog service is CRUD, but the item still guards its
own stock rules — a small aggregate with a few invariants and no domain events.

```d5
d5-aggregate
  title Catalog Item Aggregate

  Aggregate(catalog_item_agg, "Catalog Item", root: "Catalog Item") {
    Entity(catalog_item, "Catalog Item")
    ValueObject(catalog_item_id, "Catalog Item ID")
    ValueObject(name, "Name")
    ValueObject(price, "Price")
    ValueObject(available_stock, "Available Stock")
    ValueObject(restock_threshold, "Restock Threshold")
    ValueObject(max_stock_threshold, "Max Stock Threshold")
    ValueObject(brand, "Catalog Brand")
    ValueObject(type, "Catalog Type")

    Invariants {
      Invariant("Available stock never goes negative — an order removal larger than the stock on hand is clamped to what is available")
      Invariant("When available stock drops to or below the restock threshold, the item is flagged for reorder")
      Invariant("A restock never takes available stock above the max stock threshold")
    }
  }
```
