import { describe, it, expect, beforeEach } from 'vitest';
import { detectSubdomain } from '../src/d5-subdomain/detector.js';
import { D5SubdomainDb } from '../src/d5-subdomain/db.js';
import { parse } from '../src/d5-subdomain/parser.js';
import { render } from '../src/d5-subdomain/renderer.js';

describe('d5-subdomain detector', () => {
  it('detects text starting with d5-subdomain', () => {
    expect(detectSubdomain('d5-subdomain\n  title X')).toBe(true);
    expect(detectSubdomain('  d5-subdomain\n  title X')).toBe(true);
  });

  it('rejects non-matching text', () => {
    expect(detectSubdomain('d5-domain\n  title X')).toBe(false);
    expect(detectSubdomain('d5-context\n  title X')).toBe(false);
    expect(detectSubdomain('flowchart LR')).toBe(false);
  });
});

describe('d5-subdomain db', () => {
  let db: D5SubdomainDb;

  beforeEach(() => {
    db = new D5SubdomainDb();
  });

  it('stores subdomains with bounded contexts', () => {
    db.addSubdomain('catalog', 'Product Catalog', 'core');
    db.addBoundedContext('product_ctx', 'Product Context', 'catalog');
    db.addBoundedContext('pricing_ctx', 'Pricing Context', 'catalog');

    const subs = db.getSubdomains();
    expect(subs).toHaveLength(1);
    expect(subs[0].id).toBe('catalog');

    const bcs = db.getBoundedContexts();
    expect(bcs).toHaveLength(2);
    expect(bcs[0]).toEqual({ id: 'product_ctx', label: 'Product Context', subdomainId: 'catalog', team: undefined });
  });

  it('stores bounded context with team', () => {
    db.addSubdomain('catalog', 'Catalog', 'core');
    db.addBoundedContext('product_ctx', 'Product Context', 'catalog', 'Catalog Team');

    expect(db.getBoundedContexts()[0].team).toBe('Catalog Team');
  });

  it('stores relationships between bounded contexts', () => {
    db.addRelationship('order_ctx', 'pricing_ctx', 'Conformist');

    const rels = db.getRelationships();
    expect(rels).toHaveLength(1);
    expect(rels[0]).toEqual({ source: 'order_ctx', target: 'pricing_ctx', label: 'Conformist' });
  });

  it('clears all state', () => {
    db.setTitle('Test');
    db.addSubdomain('s1', 'S1', 'core');
    db.addBoundedContext('bc1', 'BC1', 's1');
    db.addRelationship('bc1', 'bc2', 'ACL');
    db.clear();

    expect(db.getTitle()).toBeUndefined();
    expect(db.getSubdomains()).toEqual([]);
    expect(db.getBoundedContexts()).toEqual([]);
    expect(db.getRelationships()).toEqual([]);
  });
});

describe('d5-subdomain parser', () => {
  it('parses subdomains with bounded contexts and relationships', () => {
    const db = new D5SubdomainDb();
    parse(`d5-subdomain
  title ACME Retail - Subdomain Overview

  Subdomain(catalog, "Product Catalog", core) {
    BoundedContext(product_ctx, "Product Context")
    BoundedContext(pricing_ctx, "Pricing Context")
  }

  Subdomain(ordering, "Order Management", core) {
    BoundedContext(order_ctx, "Order Context")
  }

  Subdomain(inventory, "Inventory", supporting) {
    BoundedContext(stock_ctx, "Stock Context")
  }

  %% Context relationships
  Rel(order_ctx, pricing_ctx, "Conformist")
  Rel(order_ctx, stock_ctx, "ACL")
  Rel(pricing_ctx, product_ctx, "Partnership")
`, db);

    expect(db.getTitle()).toBe('ACME Retail - Subdomain Overview');

    const subs = db.getSubdomains();
    expect(subs).toHaveLength(3);
    expect(subs[0]).toEqual({ id: 'catalog', label: 'Product Catalog', type: 'core' });

    const bcs = db.getBoundedContexts();
    expect(bcs).toHaveLength(4);
    expect(bcs[0].subdomainId).toBe('catalog');
    expect(bcs[2].label).toBe('Order Context');
    expect(bcs[2].subdomainId).toBe('ordering');

    const rels = db.getRelationships();
    expect(rels).toHaveLength(3);
    expect(rels[0]).toEqual({ source: 'order_ctx', target: 'pricing_ctx', label: 'Conformist' });
  });

  it('parses BoundedContext with team attribute', () => {
    const db = new D5SubdomainDb();
    parse(`d5-subdomain
  title Test

  Subdomain(catalog, "Catalog", core) {
    BoundedContext(product_ctx, "Product Context", team: "Catalog Team")
  }
`, db);

    const bcs = db.getBoundedContexts();
    expect(bcs[0].team).toBe('Catalog Team');
  });
});

describe('d5-subdomain renderer', () => {
  let db: D5SubdomainDb;
  let container: SVGSVGElement;

  beforeEach(() => {
    db = new D5SubdomainDb();
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(container);
  });

  it('renders subdomains containing bounded contexts', () => {
    db.setTitle('Test');
    db.addSubdomain('catalog', 'Product Catalog', 'core');
    db.addBoundedContext('product_ctx', 'Product Context', 'catalog');
    db.addBoundedContext('pricing_ctx', 'Pricing Context', 'catalog');

    render(db, container);

    const subdomains = container.querySelectorAll('.d5-subdomain');
    expect(subdomains).toHaveLength(1);
    expect(subdomains[0].getAttribute('class')).toContain('d5-subdomain-core');
    expect(subdomains[0].textContent).toContain('Product Catalog');

    const bcs = container.querySelectorAll('.d5-bounded-context');
    expect(bcs).toHaveLength(2);
    expect(bcs[0].textContent).toContain('Product Context');
    expect(bcs[1].textContent).toContain('Pricing Context');
  });

  it('renders relationships with labels', () => {
    db.addSubdomain('s1', 'S1', 'core');
    db.addSubdomain('s2', 'S2', 'supporting');
    db.addBoundedContext('bc1', 'BC1', 's1');
    db.addBoundedContext('bc2', 'BC2', 's2');
    db.addRelationship('bc1', 'bc2', 'ACL');

    render(db, container);

    const rels = container.querySelectorAll('.d5-rel');
    expect(rels).toHaveLength(1);
    expect(rels[0].textContent).toContain('ACL');
  });

  it('renders bounded contexts as ellipses', () => {
    db.addSubdomain('s1', 'S1', 'core');
    db.addBoundedContext('bc1', 'BC1', 's1');

    render(db, container);

    const ellipses = container.querySelectorAll('.d5-bounded-context ellipse');
    expect(ellipses).toHaveLength(1);
  });

  it('renders team labels when provided', () => {
    db.addSubdomain('s1', 'S1', 'core');
    db.addBoundedContext('bc1', 'BC1', 's1', 'Alpha Team');

    render(db, container);

    const bc = container.querySelector('.d5-bounded-context');
    expect(bc!.textContent).toContain('Alpha Team');
  });

  it('renders legend with subdomain types', () => {
    db.addSubdomain('s1', 'S1', 'core');
    db.addBoundedContext('bc1', 'BC1', 's1');

    render(db, container);

    const legend = container.querySelector('.d5-legend');
    expect(legend).not.toBeNull();
    expect(legend!.textContent).toContain('Core');
    expect(legend!.textContent).toContain('Supporting');
    expect(legend!.textContent).toContain('Generic');
  });

  it('snapshot: full context map with multiple relationship types', () => {
    db.setTitle('ACME Context Map');

    db.addSubdomain('catalog', 'Product Catalog', 'core');
    db.addBoundedContext('product_ctx', 'Product Context', 'catalog', 'Catalog Team');
    db.addBoundedContext('pricing_ctx', 'Pricing Context', 'catalog');

    db.addSubdomain('ordering', 'Order Management', 'core');
    db.addBoundedContext('order_ctx', 'Order Context', 'ordering', 'Order Squad');

    db.addSubdomain('inventory', 'Inventory', 'supporting');
    db.addBoundedContext('stock_ctx', 'Stock Context', 'inventory');

    db.addSubdomain('identity', 'Identity', 'generic');
    db.addBoundedContext('auth_ctx', 'Auth Context', 'identity');

    db.addRelationship('order_ctx', 'pricing_ctx', 'Conformist');
    db.addRelationship('pricing_ctx', 'product_ctx', 'Partnership');
    db.addRelationship('order_ctx', 'stock_ctx', 'ACL');
    db.addRelationship('order_ctx', 'auth_ctx', 'Open Host Service');
    db.addRelationship('stock_ctx', 'product_ctx', 'Customer-Supplier');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: single subdomain with multiple bounded contexts', () => {
    db.setTitle('Catalog Subdomain');
    db.addSubdomain('catalog', 'Product Catalog', 'core');
    db.addBoundedContext('product_ctx', 'Product Context', 'catalog', 'Catalog Team');
    db.addBoundedContext('pricing_ctx', 'Pricing Context', 'catalog');
    db.addBoundedContext('search_ctx', 'Search Context', 'catalog');

    db.addRelationship('pricing_ctx', 'product_ctx', 'Shared Kernel');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: minimal diagram with no relationships', () => {
    db.setTitle('Simple Map');
    db.addSubdomain('core1', 'Core Service', 'core');
    db.addBoundedContext('bc1', 'Main Context', 'core1');

    db.addSubdomain('support1', 'Support Service', 'supporting');
    db.addBoundedContext('bc2', 'Helper Context', 'support1');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: subdomain with team labels', () => {
    db.addSubdomain('ordering', 'Order Management', 'core');
    db.addBoundedContext('order_ctx', 'Order Context', 'ordering', 'Order Squad');
    db.addBoundedContext('fulfillment_ctx', 'Fulfillment Context', 'ordering', 'Logistics Team');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: all three subdomain types', () => {
    db.setTitle('All Types');
    db.addSubdomain('core_sd', 'Core SD', 'core');
    db.addBoundedContext('bc_core', 'Core BC', 'core_sd');

    db.addSubdomain('supporting_sd', 'Supporting SD', 'supporting');
    db.addBoundedContext('bc_supporting', 'Supporting BC', 'supporting_sd');

    db.addSubdomain('generic_sd', 'Generic SD', 'generic');
    db.addBoundedContext('bc_generic', 'Generic BC', 'generic_sd');

    db.addRelationship('bc_core', 'bc_supporting', 'Customer-Supplier');
    db.addRelationship('bc_core', 'bc_generic', 'Conformist');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });
});
