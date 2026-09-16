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

  // Regression test for a real bug found fuzz-testing the gallery (random toggles across
  // every example — 100% reproduction on every d5-subdomain diagram): hiding every Bounded
  // Context of *one* Subdomain, while another Subdomain still has visible ones, drew a
  // stray rect pinned at the SVG's origin — exactly "a component not properly cleaned up,
  // rendering a flat rectangle" as first spotted by hand. Root cause, confirmed empirically
  // against @dagrejs/dagre: a compound cluster (a Subdomain) with zero children gets `x`/`y`
  // from Dagre but no `width`/`height` *at all* (`undefined`, not `0`) — `undefined / 2` is
  // `NaN`, which then poisoned the box's `x`/`y` too. This is a different code path from the
  // "hide literally everything" case below: here the *graph* isn't empty (Order Context is
  // still there), only one *cluster* inside it is.
  it('hiding every Bounded Context of one Subdomain (while another still has one) draws a sane fallback box, not NaN', () => {
    const db = buildDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachSubdomainToggle(svg, db, container, { panel: false });
    handle.hide('product_ctx');
    handle.hide('pricing_ctx'); // 'catalog' Subdomain's cluster is now empty

    expect(svg.outerHTML).not.toContain('NaN');
    expect(svg.outerHTML).not.toContain('Infinity');
    expect(svg.textContent).toContain('Product Catalog'); // the empty Subdomain box itself stays
    expect(svg.textContent).toContain('Order Context'); // untouched sibling Subdomain is fine

    const catalogBox = Array.from(svg.querySelectorAll('.d5-subdomain')).find((el) =>
      el.textContent?.includes('Product Catalog'),
    )!;
    const rect = catalogBox.querySelector('rect')!;
    expect(Number(rect.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(rect.getAttribute('height'))).toBeGreaterThan(0);
    expect(Number.isFinite(Number(rect.getAttribute('x')))).toBe(true);
    expect(Number.isFinite(Number(rect.getAttribute('y')))).toBe(true);
  });

  // Regression test for a real bug spotted by hand right after the fix above shipped:
  // emptying *two or more* Subdomain clusters at once rendered them stacked on top of each
  // other, spilling out of a viewBox far smaller than the boxes actually drawn into it —
  // "one giant overlapping blob" instead of the sane fallback boxes above. Root cause: fixing
  // the NaN (previous test) by drawing an empty cluster at a fallback size wasn't enough —
  // Dagre had already laid out *and spaced* every cluster assuming an empty one has zero
  // size, so a nonzero fallback box drawn on top of that spacing overlaps its neighbor, and
  // the graph's own overall width/height (which the viewBox is built from) didn't grow to
  // fit it either. Fixed by giving every empty Subdomain an invisible placeholder child
  // sized like a real Bounded Context *before* calling `dagre.layout()`, so Dagre reserves
  // real space for it from the start instead of the draw step trying to paper over a size
  // Dagre never accounted for.
  it('emptying multiple Subdomains at once does not overlap them or spill past the viewBox', () => {
    const db = new D5SubdomainDb();
    db.addSubdomain('a', 'Subdomain A', 'core');
    db.addBoundedContext('a1', 'A One', 'a');
    db.addSubdomain('b', 'Subdomain B', 'supporting');
    db.addBoundedContext('b1', 'B One', 'b');
    db.addSubdomain('c', 'Subdomain C', 'generic');
    db.addBoundedContext('c1', 'C One', 'c');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachSubdomainToggle(svg, db, container, { panel: false });
    handle.hide('a1');
    handle.hide('b1');
    handle.hide('c1'); // all three Subdomain clusters are now empty at once

    const [, , vbWidth, vbHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    const rects = Array.from(svg.querySelectorAll('.d5-subdomain > rect')).map((r) => ({
      x: Number(r.getAttribute('x')),
      y: Number(r.getAttribute('y')),
      w: Number(r.getAttribute('width')),
      h: Number(r.getAttribute('height')),
    }));
    expect(rects).toHaveLength(3);

    // every box fully inside the viewBox
    rects.forEach((r) => {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(vbWidth + 0.5);
      expect(r.y + r.h).toBeLessThanOrEqual(vbHeight + 0.5);
    });

    // no two boxes overlap
    const overlaps = (p: (typeof rects)[number], q: (typeof rects)[number]) =>
      p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
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
