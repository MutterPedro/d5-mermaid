import { describe, it, expect, beforeEach } from 'vitest';
import { D5DomainDb } from '../src/d5-domain/db.js';

describe('d5-domain db', () => {
  let db: D5DomainDb;

  beforeEach(() => {
    db = new D5DomainDb();
  });

  it('starts with empty state', () => {
    expect(db.getDomains()).toEqual([]);
    expect(db.getSubdomains()).toEqual([]);
    expect(db.getRelationships()).toEqual([]);
  });

  it('stores a domain', () => {
    db.addDomain('acme', 'ACME Retail');
    expect(db.getDomains()).toEqual([{ id: 'acme', label: 'ACME Retail' }]);
  });

  it('stores multiple domains in declaration order', () => {
    db.addDomain('sales', 'Sales');
    db.addDomain('fulfillment', 'Fulfillment');

    expect(db.getDomains()).toEqual([
      { id: 'sales', label: 'Sales' },
      { id: 'fulfillment', label: 'Fulfillment' },
    ]);
  });

  it('stores subdomains with type and owning domain', () => {
    db.addDomain('acme', 'ACME');
    db.addSubdomain('catalog', 'Product Catalog', 'core', 'acme');
    db.addSubdomain('inventory', 'Inventory', 'supporting', 'acme');
    db.addSubdomain('payments', 'Payments', 'generic', 'acme');

    const subdomains = db.getSubdomains();
    expect(subdomains).toHaveLength(3);
    expect(subdomains[0]).toEqual({
      id: 'catalog',
      label: 'Product Catalog',
      type: 'core',
      domainId: 'acme',
    });
    expect(subdomains[1]).toEqual({
      id: 'inventory',
      label: 'Inventory',
      type: 'supporting',
      domainId: 'acme',
    });
    expect(subdomains[2]).toEqual({
      id: 'payments',
      label: 'Payments',
      type: 'generic',
      domainId: 'acme',
    });
  });

  it('stores relationships between subdomains', () => {
    db.addRelationship('ordering', 'catalog', 'depends on');

    const rels = db.getRelationships();
    expect(rels).toHaveLength(1);
    expect(rels[0]).toEqual({ source: 'ordering', target: 'catalog', label: 'depends on' });
  });

  it('clears all state', () => {
    db.addDomain('acme', 'ACME');
    db.addSubdomain('s1', 'Sub 1', 'core', 'acme');
    db.addRelationship('s1', 's2', 'uses');

    db.clear();

    expect(db.getDomains()).toEqual([]);
    expect(db.getSubdomains()).toEqual([]);
    expect(db.getRelationships()).toEqual([]);
  });

  it('stores and retrieves diagram title', () => {
    db.setTitle('My Domain Diagram');
    expect(db.getTitle()).toBe('My Domain Diagram');
  });
});
