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

  it('parses Event() domain-event edges, including parallel ones', () => {
    const db = new D5ContextDb();
    parse(`d5-context
  BoundedContext(lending_ctx, "Lending") {
    Aggregate(patron_agg, "Patron", root: "Patron")
    Aggregate(book_agg, "Book", root: "Book")
    Rel(patron_agg, book_agg, "by id")
    Event(patron_agg, book_agg, "BookPlacedOnHold")
    Event(patron_agg, book_agg, "BookCheckedOut")
    Event(book_agg, patron_agg, "BookHoldExpired")
  }
`, db);

    expect(db.getRelationships()).toHaveLength(1);
    const events = db.getEvents();
    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ source: 'patron_agg', target: 'book_agg', name: 'BookPlacedOnHold' });
    expect(events[2]).toEqual({ source: 'book_agg', target: 'patron_agg', name: 'BookHoldExpired' });
  });

  it('parses ReadModel() elements and Event edges targeting them', () => {
    const db = new D5ContextDb();
    parse(`d5-context
  BoundedContext(lending_ctx, "Lending") {
    Aggregate(book_agg, "Book", root: "Book")
    ReadModel(patron_profile, "Patron Profile")
    ReadModel(daily_sheet, "Expiring Holds Daily Sheet")
    Event(book_agg, patron_profile, "BookCheckedOut")
  }
`, db);

    const rms = db.getReadModels();
    expect(rms).toHaveLength(2);
    expect(rms[0]).toEqual({ id: 'patron_profile', label: 'Patron Profile' });
    expect(db.getAggregates()).toHaveLength(1);
    expect(db.getEvents()[0]).toEqual({
      source: 'book_agg',
      target: 'patron_profile',
      name: 'BookCheckedOut',
    });
  });

  it('parses Policy() reactions, including a self-directed one', () => {
    const db = new D5ContextDb();
    parse(`d5-context
  BoundedContext(lending_ctx, "Lending") {
    Aggregate(patron_agg, "Patron", root: "Patron")
    Aggregate(book_agg, "Book", root: "Book")
    Policy(book_agg, patron_agg, "when a book is checked out, complete the open-ended hold")
    Policy(book_agg, book_agg, "each day: expire stale holds")
  }
`, db);

    const policies = db.getPolicies();
    expect(policies).toHaveLength(2);
    expect(policies[0]).toEqual({
      source: 'book_agg',
      target: 'patron_agg',
      rule: 'when a book is checked out, complete the open-ended hold',
    });
    expect(policies[1].source).toBe('book_agg');
    expect(policies[1].target).toBe('book_agg');
  });
});

describe('d5-context parser — beyond aggregates', () => {
  const SOURCE = `d5-context
  BoundedContext(order_ctx, "Ordering", team: "Order Squad") {
    Aggregate(order_agg, "Order", root: "Order")
    DomainService(pricing, "Order Pricing")
    Process(checkout, "Checkout")
    Command(customer, order_agg, "Place Order")
    Command(checkout, order_agg, "Confirm Order")
    Event(order_agg, payment_ctx, "OrderPlaced")
  }

  Actor(customer, "Customer")
  BoundedContext(payment_ctx, "Payment")
`;

  it('parses DomainService() and Process() as elements of the context', () => {
    const db = new D5ContextDb();
    parse(SOURCE, db);

    expect(db.getDomainServices()).toEqual([{ id: 'pricing', label: 'Order Pricing' }]);
    expect(db.getProcesses()).toEqual([{ id: 'checkout', label: 'Checkout' }]);
  });

  it('parses Command() edges', () => {
    const db = new D5ContextDb();
    parse(SOURCE, db);

    expect(db.getCommands()).toEqual([
      { source: 'customer', target: 'order_agg', name: 'Place Order' },
      { source: 'checkout', target: 'order_agg', name: 'Confirm Order' },
    ]);
  });

  it('takes the BoundedContext with a body as the subject and a bodiless one as a neighbour', () => {
    const db = new D5ContextDb();
    parse(SOURCE, db);

    expect(db.getBoundedContext()).toEqual({ id: 'order_ctx', label: 'Ordering', team: 'Order Squad' });
    expect(db.getNeighbours()).toEqual([{ id: 'payment_ctx', label: 'Payment' }]);
    expect(db.getActors()).toEqual([{ id: 'customer', label: 'Customer' }]);
  });

  it('accepts a neighbour declared ahead of the subject', () => {
    const db = new D5ContextDb();
    parse(`d5-context
  BoundedContext(payment_ctx, "Payment")
  BoundedContext(order_ctx, "Ordering") {
    Aggregate(order_agg, "Order", root: "Order")
  }
`, db);

    expect(db.getBoundedContext()?.id).toBe('order_ctx');
    expect(db.getNeighbours()).toEqual([{ id: 'payment_ctx', label: 'Payment' }]);
  });

  it('still takes a lone bodiless BoundedContext as the subject', () => {
    const db = new D5ContextDb();
    parse(`d5-context
  BoundedContext(order_ctx, "Ordering")
  Aggregate(order_agg, "Order", root: "Order")
`, db);

    expect(db.getBoundedContext()?.id).toBe('order_ctx');
    expect(db.getNeighbours()).toEqual([]);
  });

  it('clears the new state', () => {
    const db = new D5ContextDb();
    parse(SOURCE, db);
    db.clear();

    expect(db.getDomainServices()).toEqual([]);
    expect(db.getProcesses()).toEqual([]);
    expect(db.getNeighbours()).toEqual([]);
    expect(db.getActors()).toEqual([]);
    expect(db.getCommands()).toEqual([]);
  });
});

describe('d5-context renderer — beyond aggregates', () => {
  let db: D5ContextDb;
  let container: SVGSVGElement;

  const rectOf = (selector: string): { x0: number; y0: number; x1: number; y1: number } => {
    const r = container.querySelector(`${selector} rect`)!;
    const x0 = Number(r.getAttribute('x'));
    const y0 = Number(r.getAttribute('y'));
    return { x0, y0, x1: x0 + Number(r.getAttribute('width')), y1: y0 + Number(r.getAttribute('height')) };
  };
  const within = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>): boolean =>
    a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;
  const apart = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>): boolean =>
    a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1;

  beforeEach(() => {
    db = new D5ContextDb();
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(container);
    db.setTitle('Ordering');
    db.setBoundedContext('order_ctx', 'Ordering', 'Order Squad');
    db.addAggregate('order_agg', 'Order', 'Order');
    db.addDomainService('pricing', 'Order Pricing');
    db.addProcess('checkout', 'Checkout');
    db.addNeighbour('payment_ctx', 'Payment');
    db.addActor('customer', 'Customer');
    db.addTerm('Order', 'A confirmed purchase request');
    db.addRelationship('order_agg', 'pricing', 'priced by');
    db.addCommand('customer', 'order_agg', 'Place Order');
    db.addEvent('order_agg', 'checkout', 'OrderPlaced');
    db.addEvent('checkout', 'payment_ctx', 'PaymentRequested');
  });

  for (const direction of ['TB', 'LR', 'BT', 'RL']) {
    it(`keeps services and processes inside the boundary, neighbours and actors outside it (${direction})`, () => {
      db.setDirection(direction);
      render(db, container);

      const boundary = rectOf('.d5-bounded-context');
      expect(within(rectOf('.d5-aggregate'), boundary)).toBe(true);
      expect(within(rectOf('.d5-domain-service'), boundary)).toBe(true);
      expect(within(rectOf('.d5-process'), boundary)).toBe(true);
      expect(within(rectOf('.d5-language-note'), boundary)).toBe(true);
      expect(apart(rectOf('.d5-neighbour-context'), boundary)).toBe(true);
      expect(apart(rectOf('.d5-actor'), boundary)).toBe(true);

      const [, , vbW, vbH] = container.getAttribute('viewBox')!.split(' ').map(Number);
      for (const sel of ['.d5-bounded-context', '.d5-neighbour-context', '.d5-actor']) {
        expect(within(rectOf(sel), { x0: 0, y0: 0, x1: vbW, y1: vbH })).toBe(true);
      }
    });
  }

  it('labels each kind of node with its type', () => {
    render(db, container);

    expect(container.querySelector('.d5-domain-service')!.textContent).toBe('Order Pricingdomain service');
    expect(container.querySelector('.d5-process')!.textContent).toBe('Checkoutprocess');
    expect(container.querySelector('.d5-neighbour-context')!.textContent).toBe('Paymentbounded context');
    expect(container.querySelector('.d5-actor')!.textContent).toBe('Customeractor');
  });

  it('draws a Command as its own kind of edge, tagged with its name', () => {
    render(db, container);

    const commands = container.querySelectorAll('.d5-command');
    expect(commands).toHaveLength(1);
    expect(commands[0].querySelector('.d5-command-label')!.textContent).toBe('Place Order');
    expect(commands[0].querySelector('path')!.getAttribute('marker-end')).toBe('url(#d5-command-arrowhead)');
    expect(container.querySelector('[id="d5-command-arrowhead"]')).not.toBeNull();
  });

  it('draws an Event that leaves the context', () => {
    render(db, container);

    const labels = [...container.querySelectorAll('.d5-event-label')].map((e) => e.textContent);
    expect(labels).toEqual(['OrderPlaced', 'PaymentRequested']);
  });

  it('leaves a context with nothing outside it laid out exactly as before', () => {
    const plain = new D5ContextDb();
    plain.setBoundedContext('ctx', 'Minimal Context');
    plain.addAggregate('a1', 'Root Agg', 'Root');
    render(plain, container);

    expect(container.querySelector('[id="d5-command-arrowhead"]')).toBeNull();
    expect(rectOf('.d5-bounded-context')).toMatchObject({ x0: 30, y0: 30 });
  });

  it('snapshot: context with a service, a process, an actor and a neighbouring context', () => {
    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
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
