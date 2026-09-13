import { describe, it, expect, beforeEach } from 'vitest';
import { D5ContextDb } from '../src/d5-context/db.js';
import { attachContextToggle, contextToggleAdapter } from '../src/d5-context/toggle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildDb(): D5ContextDb {
  const db = new D5ContextDb();
  db.setBoundedContext('order_ctx', 'Ordering', 'Order Squad');
  db.addAggregate('order_agg', 'Order', 'Order');
  db.addAggregate('buyer_agg', 'Buyer', 'Buyer');
  db.addReadModel('order_view', 'My Orders');
  db.addTerm('Order', 'A confirmed purchase request');
  db.addRelationship('order_agg', 'buyer_agg', 'references');
  db.addEvent('order_agg', 'buyer_agg', 'OrderStarted');
  db.addEvent('order_agg', 'order_view', 'OrderStatusChanged');
  db.addPolicy('order_agg', 'order_agg', 'advance when stock confirmed');
  return db;
}

describe('contextToggleAdapter', () => {
  let db: D5ContextDb;

  beforeEach(() => {
    db = buildDb();
  });

  it('lists each Aggregate as a toggle item — not ReadModels or Terms', () => {
    expect(contextToggleAdapter.items(db)).toEqual([
      { id: 'order_agg', label: 'Order' },
      { id: 'buyer_agg', label: 'Buyer' },
    ]);
  });

  it('hiding an aggregate drops Rels/Events/Policies touching it, keeps ReadModels/Terms/BC', () => {
    const filtered = contextToggleAdapter.filter(db, new Set(['buyer_agg']));

    expect(filtered.getAggregates()).toEqual([{ id: 'order_agg', label: 'Order', root: 'Order', fields: undefined }]);
    expect(filtered.getRelationships()).toEqual([]); // order_agg -> buyer_agg, buyer_agg now gone
    expect(filtered.getEvents()).toEqual([
      { source: 'order_agg', target: 'order_view', name: 'OrderStatusChanged' },
    ]); // the OrderStarted event into buyer_agg is dropped; the one into the read model stays
    expect(filtered.getPolicies()).toEqual([
      { source: 'order_agg', target: 'order_agg', rule: 'advance when stock confirmed' },
    ]); // self-referential policy on the still-visible aggregate is untouched
    expect(filtered.getReadModels()).toEqual([{ id: 'order_view', label: 'My Orders' }]);
    expect(filtered.getTerms()).toEqual([{ term: 'Order', definition: 'A confirmed purchase request' }]);
    expect(filtered.getBoundedContext()).toEqual({ id: 'order_ctx', label: 'Ordering', team: 'Order Squad' });
  });

  it('hiding the aggregate that owns the self-policy drops the policy too', () => {
    const filtered = contextToggleAdapter.filter(db, new Set(['order_agg']));
    expect(filtered.getPolicies()).toEqual([]);
    expect(filtered.getEvents()).toEqual([]);
    expect(filtered.getRelationships()).toEqual([]);
    expect(filtered.getReadModels()).toEqual([{ id: 'order_view', label: 'My Orders' }]); // never hidden
  });
});

describe('attachContextToggle (integration, real renderer)', () => {
  it('hiding an aggregate removes it and its edges, keeps the read model', () => {
    const db = buildDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachContextToggle(svg, db, container, { panel: false });
    expect(svg.textContent).toContain('Buyer');
    expect(svg.textContent).toContain('My Orders');

    handle.hide('buyer_agg');

    expect(svg.textContent).not.toContain('Buyer');
    expect(svg.textContent).toContain('My Orders'); // read model stays
    expect(svg.textContent).toContain('Order'); // remaining aggregate stays
  });

  // Regression test (see the analogous d5-domain one for the full story): `dagre.layout()`
  // on an empty graph reports `-Infinity` for width/height, which the `|| 0` fallback
  // doesn't catch. d5-context lays every Aggregate/ReadModel out in one shared graph, so
  // this only triggers with no ReadModels either — a diagram with just Aggregates, fully
  // toggled off.
  it('hiding the only aggregate in an otherwise-empty context leaves a sane box, not -Infinity', () => {
    const db = new D5ContextDb();
    db.setBoundedContext('order_ctx', 'Ordering', 'Order Squad');
    db.addAggregate('order_agg', 'Order', 'Order');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachContextToggle(svg, db, container, { panel: false });
    handle.hide('order_agg');

    expect(svg.outerHTML).not.toContain('Infinity');
    const [, , vbWidth, vbHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(Number.isFinite(vbWidth) && vbWidth > 0).toBe(true);
    expect(Number.isFinite(vbHeight) && vbHeight > 0).toBe(true);
  });
});
