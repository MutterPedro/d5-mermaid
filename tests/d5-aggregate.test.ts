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
});
