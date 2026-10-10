import { describe, it, expect, beforeEach } from 'vitest';
import { detectAggregate } from '../src/d5-aggregate/detector.js';
import { D5AggregateDb } from '../src/d5-aggregate/db.js';
import { parse } from '../src/d5-aggregate/parser.js';
import { render } from '../src/d5-aggregate/renderer.js';

describe('d5-aggregate detector', () => {
  it('detects text starting with d5-aggregate', () => {
    expect(detectAggregate('d5-aggregate\n  title X')).toBe(true);
    expect(detectAggregate('  d5-aggregate\n  title X')).toBe(true);
  });

  it('rejects non-matching text', () => {
    expect(detectAggregate('d5-domain\n  title X')).toBe(false);
    expect(detectAggregate('d5-context\n  title X')).toBe(false);
  });
});

describe('d5-aggregate db', () => {
  let db: D5AggregateDb;

  beforeEach(() => {
    db = new D5AggregateDb();
  });

  it('stores aggregate with root', () => {
    db.setAggregate('order_agg', 'Order', 'Order');
    const agg = db.getAggregate();
    expect(agg).toEqual({ id: 'order_agg', label: 'Order', root: 'Order' });
  });

  it('stores entities', () => {
    db.addEntity('order', 'Order');
    db.addEntity('line_item', 'Line Item');

    const entities = db.getEntities();
    expect(entities).toHaveLength(2);
    expect(entities[0]).toEqual({ id: 'order', label: 'Order' });
    expect(entities[1]).toEqual({ id: 'line_item', label: 'Line Item' });
  });

  it('stores value objects', () => {
    db.addValueObject('money', 'Money');
    db.addValueObject('qty', 'Quantity');

    const vos = db.getValueObjects();
    expect(vos).toHaveLength(2);
    expect(vos[0]).toEqual({ id: 'money', label: 'Money' });
  });

  it('clears all state', () => {
    db.setTitle('X');
    db.setAggregate('a1', 'A', 'R');
    db.addEntity('e1', 'E');
    db.addValueObject('v1', 'V');
    db.clear();

    expect(db.getTitle()).toBeUndefined();
    expect(db.getAggregate()).toBeUndefined();
    expect(db.getEntities()).toEqual([]);
    expect(db.getValueObjects()).toEqual([]);
  });
});

describe('d5-aggregate parser', () => {
  it('parses a complete d5-aggregate diagram', () => {
    const db = new D5AggregateDb();
    parse(`d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(line_item, "Line Item")
    ValueObject(money, "Money")
    ValueObject(quantity, "Quantity")
    ValueObject(shipping_address, "Shipping Address")
    ValueObject(order_status, "Order Status")
  }
`, db);

    expect(db.getTitle()).toBe('Order Aggregate');

    const agg = db.getAggregate();
    expect(agg).toEqual({ id: 'order_agg', label: 'Order', root: 'Order' });

    const entities = db.getEntities();
    expect(entities).toHaveLength(2);
    expect(entities[0].label).toBe('Order');
    expect(entities[1].label).toBe('Line Item');

    const vos = db.getValueObjects();
    expect(vos).toHaveLength(4);
    expect(vos[0].label).toBe('Money');
    expect(vos[3].label).toBe('Order Status');
  });

  it('ignores comments', () => {
    const db = new D5AggregateDb();
    parse(`d5-aggregate
  title Test
  %% comment
  Aggregate(a1, "A1", root: "R1") {
    Entity(e1, "E1") %% inline
  }
`, db);

    expect(db.getAggregate()).toBeDefined();
    expect(db.getEntities()).toHaveLength(1);
  });
});

describe('d5-aggregate renderer', () => {
  let db: D5AggregateDb;
  let container: SVGSVGElement;

  beforeEach(() => {
    db = new D5AggregateDb();
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(container);
  });

  it('renders aggregate container with root visually distinguished', () => {
    db.setAggregate('order_agg', 'Order', 'Order');
    db.addEntity('order', 'Order');

    render(db, container);

    const aggEl = container.querySelector('.d5-aggregate');
    expect(aggEl).not.toBeNull();
    expect(aggEl!.textContent).toContain('Order');

    // Root entity should be visually distinguished
    const rootEl = container.querySelector('.d5-aggregate-root');
    expect(rootEl).not.toBeNull();
    expect(rootEl!.textContent).toContain('Order');
  });

  it('renders entities with entity class', () => {
    db.setAggregate('a1', 'A1', 'R1');
    db.addEntity('e1', 'E1');
    db.addEntity('e2', 'E2');

    render(db, container);

    const entities = container.querySelectorAll('.d5-entity');
    expect(entities.length).toBeGreaterThanOrEqual(2);
  });

  it('renders value objects with distinct class', () => {
    db.setAggregate('a1', 'A1', 'R1');
    db.addValueObject('v1', 'Money');
    db.addValueObject('v2', 'Quantity');

    render(db, container);

    const vos = container.querySelectorAll('.d5-value-object');
    expect(vos).toHaveLength(2);
    expect(vos[0].textContent).toContain('Money');
  });

  it('does not render any Rel elements (containment implies relationships)', () => {
    db.setAggregate('a1', 'A1', 'R1');
    db.addEntity('e1', 'E1');
    db.addValueObject('v1', 'V1');

    render(db, container);

    const rels = container.querySelectorAll('.d5-rel');
    expect(rels).toHaveLength(0);
  });

  it('snapshot: full aggregate with root, entities, and value objects', () => {
    db.setTitle('Order Aggregate');
    db.setAggregate('order_agg', 'Order', 'Order');
    db.addEntity('order', 'Order');
    db.addEntity('line_item', 'Line Item');
    db.addValueObject('money', 'Money');
    db.addValueObject('quantity', 'Quantity');
    db.addValueObject('shipping_address', 'Shipping Address');
    db.addValueObject('order_status', 'Order Status');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: aggregate with only entities', () => {
    db.setTitle('Customer Aggregate');
    db.setAggregate('customer_agg', 'Customer', 'Customer');
    db.addEntity('customer', 'Customer');
    db.addEntity('contact', 'Contact');
    db.addEntity('address_book', 'Address Book');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: aggregate with only value objects', () => {
    db.setTitle('Money Aggregate');
    db.setAggregate('money_agg', 'Money', 'Money');
    db.addValueObject('amount', 'Amount');
    db.addValueObject('currency', 'Currency');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: minimal aggregate with just root entity', () => {
    db.setAggregate('a1', 'Simple', 'Simple');
    db.addEntity('simple', 'Simple');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });
});

const ORDER_SOURCE = `d5-aggregate
  title Order Aggregate

  Aggregate(order_agg, "Order", root: "Order") {
    Entity(order, "Order")
    Entity(line_item, "Line Item")
    ValueObject(money, "Money")
    ValueObject(status, "Order Status")

    Has(order, line_item, at_least_one, as: "lines")
    Has(line_item, money, as: "unit price")
    Has(order, status)
    Ref(line_item, product_agg, many, as: "product")

    Command(place, "Place Order")
    Command(pay, "Pay Order")
    Event(placed, "OrderPlaced")
    Event(paid, "OrderPaid")
    Event(audited, "OrderAudited")
    Emits(place, placed)
    Emits(pay, paid)

    Lifecycle {
      State(s_draft, "Draft")
      State(s_placed, "Placed")
      State(s_paid, "Paid")
      Transition(s_draft, s_placed, on: place)
      Transition(s_placed, s_paid, on: pay)
    }

    Invariants {
      Invariant("A placed order has at least one line")
    }
  }

  Aggregate(product_agg, "Product", root: "Product")
`;

describe('d5-aggregate parser — relations, behaviour and lifecycle', () => {
  let db: D5AggregateDb;

  beforeEach(() => {
    db = new D5AggregateDb();
    parse(ORDER_SOURCE, db);
  });

  it('parses Has() with a typed multiplicity and an optional role, defaulting to one', () => {
    expect(db.getHas()).toEqual([
      { owner: 'order', part: 'line_item', multiplicity: 'at_least_one', role: 'lines' },
      { owner: 'line_item', part: 'money', multiplicity: 'one', role: 'unit price' },
      { owner: 'order', part: 'status', multiplicity: 'one', role: undefined },
    ]);
  });

  it('parses Ref() to another aggregate', () => {
    expect(db.getRefs()).toEqual([
      { source: 'line_item', target: 'product_agg', multiplicity: 'many', role: 'product' },
    ]);
  });

  it('takes the Aggregate with a body as the subject and a bodiless one as a neighbour', () => {
    expect(db.getAggregate()).toEqual({ id: 'order_agg', label: 'Order', root: 'Order' });
    expect(db.getNeighbours()).toEqual([{ id: 'product_agg', label: 'Product', root: 'Product' }]);
  });

  it('parses commands, events and which command emits which event', () => {
    expect(db.getCommands()).toEqual([
      { id: 'place', label: 'Place Order' },
      { id: 'pay', label: 'Pay Order' },
    ]);
    expect(db.getEvents().map((e) => e.id)).toEqual(['placed', 'paid', 'audited']);
    expect(db.getEmits()).toEqual([
      { command: 'place', event: 'placed' },
      { command: 'pay', event: 'paid' },
    ]);
  });

  it('parses the Lifecycle block into states and transitions', () => {
    expect(db.getStates()).toEqual([
      { id: 's_draft', label: 'Draft' },
      { id: 's_placed', label: 'Placed' },
      { id: 's_paid', label: 'Paid' },
    ]);
    expect(db.getTransitions()).toEqual([
      { from: 's_draft', to: 's_placed', on: 'place' },
      { from: 's_placed', to: 's_paid', on: 'pay' },
    ]);
  });

  it('still parses the entities, value objects and invariants around them', () => {
    expect(db.getEntities()).toHaveLength(2);
    expect(db.getValueObjects()).toHaveLength(2);
    expect(db.getInvariants()).toHaveLength(1);
  });

  it('ignores a Has() whose multiplicity is not one of the known ones', () => {
    const other = new D5AggregateDb();
    parse(`d5-aggregate
  Aggregate(a, "A", root: "A") {
    Entity(a, "A")
    ValueObject(v, "V")
    Has(a, v, lots)
    Has(a, v, "1..*")
  }
`, other);

    expect(other.getHas()).toEqual([]);
  });

  it('clears the new state', () => {
    db.clear();

    expect(db.getHas()).toEqual([]);
    expect(db.getRefs()).toEqual([]);
    expect(db.getNeighbours()).toEqual([]);
    expect(db.getCommands()).toEqual([]);
    expect(db.getEvents()).toEqual([]);
    expect(db.getEmits()).toEqual([]);
    expect(db.getStates()).toEqual([]);
    expect(db.getTransitions()).toEqual([]);
  });
});

describe('d5-aggregate renderer — relations, behaviour and lifecycle', () => {
  let db: D5AggregateDb;
  let container: SVGSVGElement;

  type Box = { x0: number; y0: number; x1: number; y1: number };
  const boxOf = (el: Element): Box => {
    const r = el.querySelector('rect')!;
    const x0 = Number(r.getAttribute('x'));
    const y0 = Number(r.getAttribute('y'));
    return { x0, y0, x1: x0 + Number(r.getAttribute('width')), y1: y0 + Number(r.getAttribute('height')) };
  };
  const byText = (selector: string, text: string): Element =>
    [...container.querySelectorAll(selector)].find((e) => e.textContent!.startsWith(text))!;
  const within = (a: Box, b: Box): boolean =>
    a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;
  const apart = (a: Box, b: Box): boolean =>
    a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1;

  beforeEach(() => {
    db = new D5AggregateDb();
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(container);
    parse(ORDER_SOURCE, db);
  });

  it('draws each Has as an ownership edge labelled with multiplicity and role', () => {
    render(db, container);

    const labels = [...container.querySelectorAll('.d5-has')].map(
      (e) => e.querySelector('.d5-edge-label')!.textContent,
    );
    expect(labels).toEqual(['1..* lines', '1 unit price', '1']);
    expect(container.querySelector('.d5-has path')!.getAttribute('marker-start')).toBe('url(#d5-has-diamond)');
  });

  it('lays the objects out as a tree: an owner sits above what it owns', () => {
    render(db, container);

    const root = boxOf(container.querySelector('.d5-aggregate-root')!);
    const lineItem = boxOf(byText('.d5-entity', 'Line Item'));
    const money = boxOf(byText('.d5-value-object', 'Money'));
    expect(root.y1).toBeLessThan(lineItem.y0);
    expect(lineItem.y1).toBeLessThan(money.y0);
  });

  it('ranks a member nothing owns under the root, without drawing a line for it', () => {
    db.addValueObject('note', 'Delivery Note');
    render(db, container);

    const root = boxOf(container.querySelector('.d5-aggregate-root')!);
    expect(boxOf(byText('.d5-value-object', 'Delivery Note')).y0).toBeGreaterThan(root.y1);
    expect(container.querySelectorAll('.d5-has')).toHaveLength(3);
  });

  it('draws a referenced aggregate outside the boundary, everything owned inside it', () => {
    render(db, container);

    const boundary = boxOf(container.querySelector('.d5-aggregate')!);
    for (const el of container.querySelectorAll('.d5-entity, .d5-value-object')) {
      expect(within(boxOf(el), boundary)).toBe(true);
    }
    const neighbour = container.querySelector('.d5-aggregate-ref')!;
    expect(neighbour.textContent).toBe('ProductAggregate');
    expect(apart(boxOf(neighbour), boundary)).toBe(true);

    const [, , vbW, vbH] = container.getAttribute('viewBox')!.split(' ').map(Number);
    expect(within(boxOf(neighbour), { x0: 0, y0: 0, x1: vbW, y1: vbH })).toBe(true);
    expect(within(boundary, { x0: 0, y0: 0, x1: vbW, y1: vbH })).toBe(true);
  });

  it('draws each Ref as a dashed by-id edge', () => {
    render(db, container);

    const refs = container.querySelectorAll('.d5-ref');
    expect(refs).toHaveLength(1);
    expect(refs[0].querySelector('.d5-edge-label')!.textContent).toBe('* product');
    expect(refs[0].querySelector('path')!.getAttribute('stroke-dasharray')).not.toBeNull();
  });

  it('drops a Has or Ref whose endpoint is not declared', () => {
    db.addHas('order', 'nowhere');
    db.addRef('order', 'unknown_agg');
    render(db, container);

    expect(container.querySelectorAll('.d5-has')).toHaveLength(3);
    expect(container.querySelectorAll('.d5-ref')).toHaveLength(1);
  });

  it('lists each command with the events it emits, and events no command emits on their own', () => {
    render(db, container);

    const band = container.querySelector('.d5-behaviour')!;
    const tags = [...band.querySelectorAll('.d5-command-label, .d5-event-label')].map((e) => e.textContent);
    expect(tags).toEqual(['Place Order', 'OrderPlaced', 'Pay Order', 'OrderPaid', 'OrderAudited']);
  });

  it('draws the lifecycle: initial state marked, transitions labelled with their command', () => {
    render(db, container);

    const band = container.querySelector('.d5-lifecycle')!;
    const states = [...band.querySelectorAll('.d5-state')];
    expect(states.map((s) => s.textContent)).toEqual(['Draft', 'Placed', 'Paid']);
    expect(states[0].getAttribute('class')).toContain('d5-state-initial');
    expect(states.map((s) => s.querySelectorAll('rect').length)).toEqual([1, 1, 2]); // terminal: double outline
    expect([...band.querySelectorAll('.d5-transition')].map((t) => t.textContent)).toEqual([
      'Place Order',
      'Pay Order',
    ]);
  });

  it('keeps every band inside the boundary and wide enough for its content', () => {
    render(db, container);

    const boundary = boxOf(container.querySelector('.d5-aggregate')!);
    for (const sel of ['.d5-behaviour', '.d5-lifecycle', '.d5-invariants']) {
      const band = container.querySelector(sel)!;
      expect(within(boxOf(band), boundary)).toBe(true);
      for (const inner of band.querySelectorAll('g')) {
        if (inner.querySelector('rect')) expect(within(boxOf(inner), boxOf(band))).toBe(true);
      }
    }
  });

  it('shows the behaviour and lifecycle bands in the plain grid layout too', () => {
    const plain = new D5AggregateDb();
    plain.setAggregate('a', 'Account', 'Account');
    plain.addEntity('account', 'Account');
    plain.addCommand('open', 'Open Account With A Fairly Long Command Name');
    plain.addEvent('opened', 'AccountOpenedWithAFairlyLongEventNameToo');
    plain.addEmits('open', 'opened');
    plain.addState('s_open', 'Open');
    render(plain, container);

    expect(container.querySelector('.d5-has')).toBeNull();
    const boundary = boxOf(container.querySelector('.d5-aggregate')!);
    const band = container.querySelector('.d5-behaviour')!;
    expect(within(boxOf(band), boundary)).toBe(true);
    const event = band.querySelector('.d5-event-label text')!;
    expect(Number(event.getAttribute('x'))).toBeLessThan(boxOf(band).x1);
    expect(container.querySelector('.d5-lifecycle')!.textContent).toBe('LifecycleOpen');
  });

  it('snapshot: aggregate with ownership, a reference, behaviour, lifecycle and invariants', () => {
    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });
});
