import { describe, it, expect, beforeEach } from 'vitest';
import { D5SubdomainDb } from '../src/d5-subdomain/db.js';
import { attachSubdomainToggle, subdomainToggleAdapter } from '../src/d5-subdomain/toggle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildDb(): D5SubdomainDb {
  const db = new D5SubdomainDb();
  db.addSubdomain('catalog', 'Product Catalog', 'core');
  db.addBoundedContext('product_ctx', 'Product Context', 'catalog', 'Catalog Team');
  db.addSubdomain('ordering', 'Order Management', 'core');
  db.addBoundedContext('order_ctx', 'Order Context', 'ordering', 'Order Squad');
  db.addRelationship('order_ctx', 'product_ctx', 'Customer-Supplier'); // cross-subdomain
  return db;
}

describe('subdomainToggleAdapter', () => {
  let db: D5SubdomainDb;

  beforeEach(() => {
    db = buildDb();
  });

  it('lists each Subdomain as a toggle item', () => {
    expect(subdomainToggleAdapter.items(db)).toEqual([
      { id: 'catalog', label: 'Product Catalog' },
      { id: 'ordering', label: 'Order Management' },
    ]);
  });

  it('hiding a subdomain drops its bounded contexts and any Rel touching one of them', () => {
    const filtered = subdomainToggleAdapter.filter(db, new Set(['catalog']));

    expect(filtered.getSubdomains()).toEqual([{ id: 'ordering', label: 'Order Management', type: 'core' }]);
    expect(filtered.getBoundedContexts().map((bc) => bc.id)).toEqual(['order_ctx']);
    expect(filtered.getRelationships()).toEqual([]); // touched product_ctx, which is now gone
  });

  it('leaves everything as-is when nothing is hidden', () => {
    const filtered = subdomainToggleAdapter.filter(db, new Set());
    expect(filtered.getSubdomains()).toHaveLength(2);
    expect(filtered.getBoundedContexts()).toHaveLength(2);
    expect(filtered.getRelationships()).toHaveLength(1);
  });
});

describe('attachSubdomainToggle (integration, real renderer)', () => {
  it('hiding a subdomain removes its Bounded Context box and the cross-subdomain Rel', () => {
    const db = buildDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachSubdomainToggle(svg, db, container, { panel: false });
    expect(svg.textContent).toContain('Product Context');
    expect(svg.querySelectorAll('.d5-rel')).toHaveLength(1);

    handle.hide('catalog');

    expect(svg.textContent).not.toContain('Product Context');
    expect(svg.textContent).toContain('Order Context');
    expect(svg.querySelectorAll('.d5-rel')).toHaveLength(0);
  });
});
