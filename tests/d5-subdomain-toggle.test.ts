import { describe, it, expect, beforeEach } from 'vitest';
import { D5SubdomainDb } from '../src/d5-subdomain/db.js';
import { attachSubdomainToggle, subdomainToggleAdapter } from '../src/d5-subdomain/toggle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildDb(): D5SubdomainDb {
  const db = new D5SubdomainDb();
  db.addSubdomain('catalog', 'Product Catalog', 'core');
  db.addBoundedContext('product_ctx', 'Product Context', 'catalog', 'Catalog Team');
  db.addBoundedContext('pricing_ctx', 'Pricing Context', 'catalog');
  db.addSubdomain('ordering', 'Order Management', 'core');
  db.addBoundedContext('order_ctx', 'Order Context', 'ordering', 'Order Squad');
  db.addRelationship('order_ctx', 'product_ctx', 'Customer-Supplier'); // cross-subdomain
  db.addRelationship('order_ctx', 'pricing_ctx', 'Conformist'); // cross-subdomain
  return db;
}

describe('subdomainToggleAdapter', () => {
  let db: D5SubdomainDb;

  beforeEach(() => {
    db = buildDb();
  });

  it('lists each Bounded Context as a toggle item, grouped by its owning Subdomain', () => {
    expect(subdomainToggleAdapter.items(db)).toEqual([
      { id: 'product_ctx', label: 'Product Context', group: 'Product Catalog' },
      { id: 'pricing_ctx', label: 'Pricing Context', group: 'Product Catalog' },
      { id: 'order_ctx', label: 'Order Context', group: 'Order Management' },
    ]);
  });

  it('hiding a bounded context drops any Rel touching it, but never a Subdomain itself', () => {
    const filtered = subdomainToggleAdapter.filter(db, new Set(['product_ctx']));

    expect(filtered.getSubdomains()).toEqual([
      { id: 'catalog', label: 'Product Catalog', type: 'core' },
      { id: 'ordering', label: 'Order Management', type: 'core' },
    ]); // both subdomains always stay
    expect(filtered.getBoundedContexts().map((bc) => bc.id).sort()).toEqual(['order_ctx', 'pricing_ctx']);
    expect(filtered.getRelationships()).toEqual([
      { source: 'order_ctx', target: 'pricing_ctx', label: 'Conformist' },
    ]);
  });

  it('leaves everything as-is when nothing is hidden', () => {
    const filtered = subdomainToggleAdapter.filter(db, new Set());
    expect(filtered.getSubdomains()).toHaveLength(2);
    expect(filtered.getBoundedContexts()).toHaveLength(3);
    expect(filtered.getRelationships()).toHaveLength(2);
  });
});

describe('attachSubdomainToggle (integration, real renderer)', () => {
  it('hiding a bounded context removes its box and any Rel touching it, keeps its Subdomain', () => {
    const db = buildDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachSubdomainToggle(svg, db, container, { panel: false });
    expect(svg.textContent).toContain('Product Context');
    expect(svg.querySelectorAll('.d5-rel')).toHaveLength(2);

    handle.hide('product_ctx');

    expect(svg.textContent).not.toContain('Product Context');
    expect(svg.textContent).toContain('Product Catalog'); // the Subdomain box stays
    expect(svg.textContent).toContain('Pricing Context'); // its sibling BC stays
    expect(svg.querySelectorAll('.d5-rel')).toHaveLength(1);
  });

  // Regression test (see the analogous d5-domain one for the full story): `dagre.layout()`
  // on an empty graph reports `-Infinity` for width/height, which the `|| 0` fallback
  // doesn't catch. d5-subdomain lays every Bounded Context out in one shared graph (unlike
  // d5-domain's per-Domain graphs), so this only triggers when literally everything is
  // hidden — still a normal thing to reach via the checklist.
  it('hiding every Bounded Context leaves a sane empty diagram, not -Infinity', () => {
    const db = buildDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachSubdomainToggle(svg, db, container, { panel: false });
    handle.hide('product_ctx');
    handle.hide('pricing_ctx');
    handle.hide('order_ctx');

    expect(svg.outerHTML).not.toContain('Infinity');
    const [, , vbWidth, vbHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(Number.isFinite(vbWidth) && vbWidth > 0).toBe(true);
    expect(Number.isFinite(vbHeight) && vbHeight > 0).toBe(true);
  });

  it('renders a checklist panel grouped by Subdomain, with one row per Bounded Context', () => {
    const db = buildDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    attachSubdomainToggle(svg, db, container);

    // 3 Bounded Context checkboxes + 1 "select all" checkbox per Subdomain group (2 Subdomains)
    const boxes = container.querySelectorAll('[data-d5-toggle-panel] input[type="checkbox"]');
    expect(boxes).toHaveLength(5);
    const panelText = container.querySelector('[data-d5-toggle-panel]')!.textContent!;
    expect(panelText).toContain('Product Catalog');
    expect(panelText).toContain('Order Management');
    expect(panelText).toContain('Product Context');
    expect(panelText).toContain('Order Context');
  });
});
