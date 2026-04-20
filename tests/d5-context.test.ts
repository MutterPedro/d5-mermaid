import { describe, it, expect, beforeEach } from 'vitest';
import { detectContext } from '../src/d5-context/detector.js';
import { D5ContextDb } from '../src/d5-context/db.js';
import { parse } from '../src/d5-context/parser.js';
import { render } from '../src/d5-context/renderer.js';

describe('d5-context detector', () => {
  it('detects text starting with d5-context', () => {
    expect(detectContext('d5-context\n  title X')).toBe(true);
    expect(detectContext('  d5-context\n  title X')).toBe(true);
  });

  it('rejects non-matching text', () => {
    expect(detectContext('d5-domain\n  title X')).toBe(false);
    expect(detectContext('d5-subdomain\n  title X')).toBe(false);
    expect(detectContext('d5-aggregate\n  title X')).toBe(false);
  });
});

describe('d5-context db', () => {
  let db: D5ContextDb;

  beforeEach(() => {
    db = new D5ContextDb();
  });

  it('stores bounded context with team', () => {
    db.setBoundedContext('order_ctx', 'Order Context', 'Order Squad');
    const bc = db.getBoundedContext();
    expect(bc).toEqual({ id: 'order_ctx', label: 'Order Context', team: 'Order Squad' });
  });

  it('stores aggregates with root', () => {
    db.addAggregate('order_agg', 'Order', 'Order');
    db.addAggregate('cart_agg', 'Shopping Cart', 'Cart');

    const aggs = db.getAggregates();
    expect(aggs).toHaveLength(2);
    expect(aggs[0]).toEqual({ id: 'order_agg', label: 'Order', root: 'Order' });
    expect(aggs[1]).toEqual({ id: 'cart_agg', label: 'Shopping Cart', root: 'Cart' });
  });

  it('stores language terms', () => {
    db.addTerm('Order', 'A confirmed purchase request');
    db.addTerm('Line Item', 'A single product entry');

    const terms = db.getTerms();
    expect(terms).toHaveLength(2);
    expect(terms[0]).toEqual({ term: 'Order', definition: 'A confirmed purchase request' });
  });

  it('stores relationships between aggregates', () => {
    db.addRelationship('order_agg', 'cart_agg', 'references by id');

    const rels = db.getRelationships();
    expect(rels).toHaveLength(1);
    expect(rels[0]).toEqual({ source: 'order_agg', target: 'cart_agg', label: 'references by id' });
  });

  it('clears all state', () => {
    db.setTitle('X');
    db.setBoundedContext('bc1', 'BC', 'Team');
    db.addAggregate('a1', 'A', 'R');
    db.addTerm('T', 'D');
    db.addRelationship('a1', 'a2', 'ref');
    db.clear();

    expect(db.getTitle()).toBeUndefined();
    expect(db.getBoundedContext()).toBeUndefined();
    expect(db.getAggregates()).toEqual([]);
    expect(db.getTerms()).toEqual([]);
    expect(db.getRelationships()).toEqual([]);
  });
});

describe('d5-context parser', () => {
  it('parses a complete d5-context diagram', () => {
    const db = new D5ContextDb();
    parse(`d5-context
  title Order Context

  BoundedContext(order_ctx, "Order Context", team: "Order Squad") {

    Language {
      Term("Order", "A confirmed purchase request with one or more line items")
      Term("Line Item", "A single product entry within an order")
    }

    Aggregate(order_agg, "Order", root: "Order")
    Aggregate(cart_agg, "Shopping Cart", root: "Cart")

    Rel(order_agg, cart_agg, "references by id")
  }
`, db);

    expect(db.getTitle()).toBe('Order Context');

    const bc = db.getBoundedContext();
    expect(bc).toEqual({ id: 'order_ctx', label: 'Order Context', team: 'Order Squad' });

    const terms = db.getTerms();
    expect(terms).toHaveLength(2);
    expect(terms[0].term).toBe('Order');

    const aggs = db.getAggregates();
    expect(aggs).toHaveLength(2);
    expect(aggs[0]).toEqual({ id: 'order_agg', label: 'Order', root: 'Order' });

    const rels = db.getRelationships();
    expect(rels).toHaveLength(1);
    expect(rels[0].label).toBe('references by id');
  });
});

describe('d5-context renderer', () => {
  let db: D5ContextDb;
  let container: SVGSVGElement;

  beforeEach(() => {
    db = new D5ContextDb();
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(container);
  });

  it('renders bounded context as outer container', () => {
    db.setBoundedContext('order_ctx', 'Order Context', 'Order Squad');

    render(db, container);

    const bcEl = container.querySelector('.d5-bounded-context');
    expect(bcEl).not.toBeNull();
    expect(bcEl!.textContent).toContain('Order Context');
  });

  it('renders aggregates with root label', () => {
    db.setBoundedContext('bc', 'BC');
    db.addAggregate('order_agg', 'Order', 'Order');
    db.addAggregate('cart_agg', 'Cart', 'Cart');

    render(db, container);

    const aggs = container.querySelectorAll('.d5-aggregate');
    expect(aggs).toHaveLength(2);
    expect(aggs[0].textContent).toContain('Order');
    // Should show the root
    expect(aggs[0].textContent).toContain('Order');
  });

  it('renders relationships', () => {
    db.setBoundedContext('bc', 'BC');
    db.addAggregate('a1', 'A1', 'R1');
    db.addAggregate('a2', 'A2', 'R2');
    db.addRelationship('a1', 'a2', 'references by id');

    render(db, container);

    const rels = container.querySelectorAll('.d5-rel');
    expect(rels).toHaveLength(1);
    expect(rels[0].textContent).toContain('references by id');
  });

  it('snapshot: full context with aggregates, language, and relationships', () => {
    db.setTitle('Order Context');
    db.setBoundedContext('order_ctx', 'Order Context', 'Order Squad');
    db.addTerm('Order', 'A confirmed purchase request with one or more line items');
    db.addTerm('Line Item', 'A single product entry within an order');
    db.addAggregate('order_agg', 'Order', 'Order');
    db.addAggregate('cart_agg', 'Shopping Cart', 'Cart');
    db.addRelationship('order_agg', 'cart_agg', 'references by id');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: context with aggregates but no language', () => {
    db.setTitle('Simple Context');
    db.setBoundedContext('ctx', 'Context');
    db.addAggregate('a1', 'Aggregate One', 'RootOne');
    db.addAggregate('a2', 'Aggregate Two', 'RootTwo');
    db.addRelationship('a1', 'a2', 'depends on');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: context with aggregate fields', () => {
    db.setTitle('Fielded Context');
    db.setBoundedContext('ctx', 'Context', 'Team');
    db.addAggregate('order_agg', 'Order', 'Order', ['id', 'customerId', 'total', 'status']);
    db.addAggregate('cart_agg', 'Cart', 'Cart', ['sessionId', 'items']);

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: minimal context with just a bounded context and one aggregate', () => {
    db.setBoundedContext('ctx', 'Minimal Context');
    db.addAggregate('a1', 'Root Agg', 'Root');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: context with only ubiquitous language terms', () => {
    db.setTitle('Glossary Only');
    db.setBoundedContext('ctx', 'Glossary Context');
    db.addTerm('Bounded Context', 'A boundary within which a model is consistent');
    db.addTerm('Aggregate', 'A cluster of domain objects treated as a unit');
    db.addTerm('Entity', 'A domain object with a distinct identity');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });
});
