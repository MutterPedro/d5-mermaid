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

    expect(db.getDomain()).toEqual({ id: 'acme', label: 'ACME Retail' });

    const subs = db.getSubdomains();
    expect(subs).toHaveLength(4);
    expect(subs[0]).toEqual({ id: 'catalog', label: 'Product Catalog', type: 'core' });
    expect(subs[1]).toEqual({ id: 'ordering', label: 'Order Management', type: 'core' });
    expect(subs[2]).toEqual({ id: 'inventory', label: 'Inventory', type: 'supporting' });
    expect(subs[3]).toEqual({ id: 'payments', label: 'Payments', type: 'generic' });
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

    expect(db.getDomain()).toEqual({ id: 'acme', label: 'ACME' });
    expect(db.getSubdomains()).toHaveLength(1);
  });
});
