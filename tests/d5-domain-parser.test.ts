import { describe, it, expect } from 'vitest';
import { parse } from '../src/d5-domain/parser.js';
import { D5DomainDb } from '../src/d5-domain/db.js';

describe('d5-domain parser', () => {
  it('parses title', () => {
    const db = new D5DomainDb();
    parse(`d5-domain
  title ACME Retail Platform
`, db);
    expect(db.getTitle()).toBe('ACME Retail Platform');
  });

  it('defaults direction to TB and accepts an override', () => {
    const dflt = new D5DomainDb();
    parse('d5-domain\n  title X\n', dflt);
    expect(dflt.getDirection()).toBe('TB');

    const lr = new D5DomainDb();
    parse('d5-domain\n  title X\n  direction LR\n', lr);
    expect(lr.getDirection()).toBe('LR');

    const bad = new D5DomainDb();
    parse('d5-domain\n  direction nonsense\n', bad);
    expect(bad.getDirection()).toBe('TB');
  });

  it('parses a domain with subdomains', () => {
    const db = new D5DomainDb();
    parse(`d5-domain
  title Test

  Domain(acme, "ACME Retail") {
    Subdomain(catalog, "Product Catalog", core)
    Subdomain(ordering, "Order Management", core)
    Subdomain(inventory, "Inventory", supporting)
    Subdomain(payments, "Payments", generic)
  }
`, db);

    expect(db.getDomains()).toEqual([{ id: 'acme', label: 'ACME Retail' }]);

    const subs = db.getSubdomains();
    expect(subs).toHaveLength(4);
    expect(subs[0]).toEqual({ id: 'catalog', label: 'Product Catalog', type: 'core', domainId: 'acme' });
    expect(subs[1]).toEqual({ id: 'ordering', label: 'Order Management', type: 'core', domainId: 'acme' });
    expect(subs[2]).toEqual({ id: 'inventory', label: 'Inventory', type: 'supporting', domainId: 'acme' });
    expect(subs[3]).toEqual({ id: 'payments', label: 'Payments', type: 'generic', domainId: 'acme' });
  });

  it('parses multiple top-level Domain blocks, attributing subdomains and cross-domain Rels correctly', () => {
    const db = new D5DomainDb();
    parse(`d5-domain
  title Two Domains

  Domain(sales, "Sales") {
    Subdomain(storefront, "Storefront", core)
  }

  Domain(fulfillment, "Fulfillment") {
    Subdomain(warehouse, "Warehouse", supporting)
  }

  Rel(warehouse, storefront, "ships orders placed in")
`, db);

    expect(db.getDomains()).toEqual([
      { id: 'sales', label: 'Sales' },
      { id: 'fulfillment', label: 'Fulfillment' },
    ]);

    const subs = db.getSubdomains();
    expect(subs).toEqual([
      { id: 'storefront', label: 'Storefront', type: 'core', domainId: 'sales' },
      { id: 'warehouse', label: 'Warehouse', type: 'supporting', domainId: 'fulfillment' },
    ]);

    const rels = db.getRelationships();
    expect(rels[0]).toEqual({
      source: 'warehouse',
      target: 'storefront',
      label: 'ships orders placed in',
    });
  });

  it('parses relationships between subdomains', () => {
    const db = new D5DomainDb();
    parse(`d5-domain
  title Test

  Domain(acme, "ACME") {
    Subdomain(ordering, "Ordering", core)
    Subdomain(catalog, "Catalog", core)
    Subdomain(inventory, "Inventory", supporting)
  }

  Rel(ordering, catalog, "depends on")
  Rel(ordering, inventory, "depends on")
`, db);

    const rels = db.getRelationships();
    expect(rels).toHaveLength(2);
    expect(rels[0]).toEqual({ source: 'ordering', target: 'catalog', label: 'depends on' });
    expect(rels[1]).toEqual({ source: 'ordering', target: 'inventory', label: 'depends on' });
  });

  it('parses relationships without a label', () => {
    const db = new D5DomainDb();
    parse(`d5-domain
  Domain(acme, "ACME") {
    Subdomain(a, "A", core)
    Subdomain(b, "B", supporting)
  }

  Rel(a, b)
  Rel(b, a, "calls")
`, db);

    const rels = db.getRelationships();
    expect(rels).toHaveLength(2);
    expect(rels[0]).toEqual({ source: 'a', target: 'b', label: '' });
    expect(rels[1]).toEqual({ source: 'b', target: 'a', label: 'calls' });
  });

  it('ignores comments', () => {
    const db = new D5DomainDb();
    parse(`d5-domain
  title Test
  %% This is a comment
  Domain(acme, "ACME") {
    Subdomain(s1, "Sub One", core) %% inline comment
  }
`, db);

    expect(db.getDomains()).toEqual([{ id: 'acme', label: 'ACME' }]);
    expect(db.getSubdomains()).toHaveLength(1);
  });
});
