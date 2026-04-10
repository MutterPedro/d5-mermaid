import { describe, it, expect, beforeAll } from 'vitest';
import mermaid from 'mermaid';
import { d5Diagrams } from '../src/index.js';

describe('D5 Mermaid Extension — Acceptance', () => {
  beforeAll(async () => {
    mermaid.initialize({ startOnLoad: false });
    await mermaid.registerExternalDiagrams(d5Diagrams);
  });

  it('renders a d5-domain diagram with subdomains and relationships as SVG', async () => {
    const diagram = `d5-domain
  title ACME Retail Platform

  Domain(acme, "ACME Retail") {
    Subdomain(catalog, "Product Catalog", core)
    Subdomain(ordering, "Order Management", core)
    Subdomain(inventory, "Inventory", supporting)
    Subdomain(payments, "Payments", generic)
  }

  Rel(ordering, catalog, "depends on")
  Rel(ordering, inventory, "depends on")
  Rel(ordering, payments, "depends on")
`;

    const { svg } = await mermaid.render('test-d5-domain', diagram);

    // Should produce valid SVG
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');

    // Should contain all subdomains
    expect(svg).toContain('Product Catalog');
    expect(svg).toContain('Order Management');
    expect(svg).toContain('Inventory');
    expect(svg).toContain('Payments');

    // Should contain subdomain type visual differentiation
    // Core subdomains should be visually prominent
    expect(svg).toContain('core');
    expect(svg).toContain('supporting');
    expect(svg).toContain('generic');

    // Should contain relationship labels
    expect(svg).toContain('depends on');

    // Should contain the domain container
    expect(svg).toContain('ACME Retail');
  });

  it('renders a d5-subdomain diagram with bounded contexts and relationships as SVG', async () => {
    const diagram = `d5-subdomain
  title ACME Retail - Context Map

  Subdomain(catalog, "Product Catalog", core) {
    BoundedContext(product_ctx, "Product Context")
    BoundedContext(pricing_ctx, "Pricing Context")
  }

  Subdomain(ordering, "Order Management", core) {
    BoundedContext(order_ctx, "Order Context")
  }

  Rel(order_ctx, pricing_ctx, "Conformist")
  Rel(pricing_ctx, product_ctx, "Partnership")
`;

    const { svg } = await mermaid.render('test-d5-subdomain', diagram);

    expect(svg).toContain('<svg');
    expect(svg).toContain('Product Context');
    expect(svg).toContain('Pricing Context');
    expect(svg).toContain('Order Context');
    expect(svg).toContain('Conformist');
    expect(svg).toContain('Partnership');
  });

  it('renders a d5-context diagram with aggregates and language as SVG', async () => {
    const diagram = `d5-context
  title Order Context

  BoundedContext(order_ctx, "Order Context", team: "Order Squad") {
    Language {
      Term("Order", "A confirmed purchase request")
    }

    Aggregate(order_agg, "Order", root: "Order")
    Aggregate(cart_agg, "Shopping Cart", root: "Cart")

    Rel(order_agg, cart_agg, "references by id")
  }
`;

    const { svg } = await mermaid.render('test-d5-context', diagram);

    expect(svg).toContain('<svg');
    expect(svg).toContain('Order Context');
    expect(svg).toContain('Order');
    expect(svg).toContain('Shopping Cart');
    expect(svg).toContain('references by id');
  });

  it('renders a d5-aggregate diagram with entities and value objects as SVG', async () => {
    const diagram = `d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(line_item, "Line Item")
    ValueObject(money, "Money")
    ValueObject(quantity, "Quantity")
  }
`;

    const { svg } = await mermaid.render('test-d5-aggregate', diagram);

    expect(svg).toContain('<svg');
    expect(svg).toContain('Order');
    expect(svg).toContain('Line Item');
    expect(svg).toContain('Money');
    expect(svg).toContain('Quantity');
  });

  it('renders the full ACME Retail domain diagram from the spec', async () => {
    const diagram = `d5-domain
  title ACME Retail Platform

  Domain(acme, "ACME Retail") {
    Subdomain(catalog, "Product Catalog", core)
    Subdomain(ordering, "Order Management", core)
    Subdomain(inventory, "Inventory", supporting)
    Subdomain(fulfillment, "Shipping & Fulfillment", supporting)
    Subdomain(customers, "Customer Management", supporting)
    Subdomain(payments, "Payments", generic)
    Subdomain(identity, "Identity & Access", generic)
  }

  Rel(ordering, catalog, "depends on")
  Rel(ordering, inventory, "depends on")
  Rel(ordering, payments, "depends on")
  Rel(ordering, customers, "depends on")
  Rel(fulfillment, ordering, "depends on")
  Rel(fulfillment, inventory, "integrates with")
`;

    const { svg } = await mermaid.render('test-full-domain', diagram);

    expect(svg).toContain('<svg');
    // All 7 subdomains present
    expect(svg).toContain('Product Catalog');
    expect(svg).toContain('Order Management');
    expect(svg).toContain('Inventory');
    expect(svg).toContain('Shipping &amp; Fulfillment');
    expect(svg).toContain('Customer Management');
    expect(svg).toContain('Payments');
    expect(svg).toContain('Identity &amp; Access');
    // Both relationship labels
    expect(svg).toContain('depends on');
    expect(svg).toContain('integrates with');
  });

  it('renders a d5-aggregate with many value objects (Product Aggregate)', async () => {
    const diagram = `d5-aggregate
  title Product Aggregate

  Aggregate(product_agg, "Product", root: "Product") {
    Entity(product, "Product")
    Entity(variant, "Product Variant")
    ValueObject(sku, "SKU")
    ValueObject(price, "Money")
    ValueObject(dimensions, "Dimensions")
    ValueObject(weight, "Weight")
  }
`;

    const { svg } = await mermaid.render('test-product-agg', diagram);

    expect(svg).toContain('Product');
    expect(svg).toContain('Product Variant');
    expect(svg).toContain('SKU');
    expect(svg).toContain('Money');
    expect(svg).toContain('Dimensions');
    expect(svg).toContain('Weight');
  });

  it('handles diagrams with comments gracefully', async () => {
    const diagram = `d5-domain
  title Commented Diagram
  %% This is a full-line comment
  Domain(test, "Test Domain") {
    Subdomain(s1, "Sub One", core) %% inline comment
  }
`;

    const { svg } = await mermaid.render('test-comments', diagram);

    expect(svg).toContain('Sub One');
    expect(svg).not.toContain('This is a full-line comment');
    expect(svg).not.toContain('inline comment');
  });

  it('renders a minimal diagram with just a title and domain', async () => {
    const diagram = `d5-domain
  title Minimal
  Domain(m, "Minimal Domain") {
  }
`;

    const { svg } = await mermaid.render('test-minimal', diagram);

    expect(svg).toContain('<svg');
    expect(svg).toContain('Minimal Domain');
  });
});
