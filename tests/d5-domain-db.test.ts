import { describe, it, expect, beforeEach } from 'vitest';
import { D5DomainDb } from '../src/d5-domain/db.js';

describe('d5-domain db', () => {
  let db: D5DomainDb;

  beforeEach(() => {
    db = new D5DomainDb();
  });

  it('starts with empty state', () => {
    expect(db.getDomain()).toBeUndefined();
    expect(db.getSubdomains()).toEqual([]);
    expect(db.getRelationships()).toEqual([]);
  });

  it('stores a domain', () => {
    db.setDomain('acme', 'ACME Retail');
    const domain = db.getDomain();
    expect(domain).toEqual({ id: 'acme', label: 'ACME Retail' });
  });

  it('stores subdomains with type', () => {
    db.addSubdomain('catalog', 'Product Catalog', 'core');
    db.addSubdomain('inventory', 'Inventory', 'supporting');
    db.addSubdomain('payments', 'Payments', 'generic');

    const subdomains = db.getSubdomains();
    expect(subdomains).toHaveLength(3);
    expect(subdomains[0]).toEqual({ id: 'catalog', label: 'Product Catalog', type: 'core' });
    expect(subdomains[1]).toEqual({ id: 'inventory', label: 'Inventory', type: 'supporting' });
    expect(subdomains[2]).toEqual({ id: 'payments', label: 'Payments', type: 'generic' });
  });

  it('stores relationships between subdomains', () => {
    db.addRelationship('ordering', 'catalog', 'depends on');

    const rels = db.getRelationships();
    expect(rels).toHaveLength(1);
    expect(rels[0]).toEqual({ source: 'ordering', target: 'catalog', label: 'depends on' });
  });

  it('clears all state', () => {
    db.setDomain('acme', 'ACME');
    db.addSubdomain('s1', 'Sub 1', 'core');
    db.addRelationship('s1', 's2', 'uses');

    db.clear();

    expect(db.getDomain()).toBeUndefined();
    expect(db.getSubdomains()).toEqual([]);
    expect(db.getRelationships()).toEqual([]);
  });

  it('stores and retrieves diagram title', () => {
    db.setTitle('My Domain Diagram');
    expect(db.getTitle()).toBe('My Domain Diagram');
  });
});
