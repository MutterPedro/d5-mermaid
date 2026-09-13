import { describe, it, expect, beforeEach } from 'vitest';
import { D5AggregateDb } from '../src/d5-aggregate/db.js';
import { attachAggregateToggle, aggregateToggleAdapter } from '../src/d5-aggregate/toggle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildDb(): D5AggregateDb {
  const db = new D5AggregateDb();
  db.setAggregate('order_agg', 'Order', 'Order');
  db.addEntity('order', 'Order');
  db.addEntity('order_item', 'Order Item');
  db.addValueObject('money', 'Money');
  db.addInvariant('An order always has at least one item');
  return db;
}

describe('aggregateToggleAdapter', () => {
  let db: D5AggregateDb;

  beforeEach(() => {
    db = buildDb();
  });

  it('lists Entities then ValueObjects as toggle items', () => {
    expect(aggregateToggleAdapter.items(db)).toEqual([
      { id: 'order', label: 'Order' },
      { id: 'order_item', label: 'Order Item' },
      { id: 'money', label: 'Money' },
    ]);
  });

  it('hiding an entity removes only that entity, leaves value objects and invariants', () => {
    const filtered = aggregateToggleAdapter.filter(db, new Set(['order_item']));

    expect(filtered.getEntities()).toEqual([{ id: 'order', label: 'Order' }]);
    expect(filtered.getValueObjects()).toEqual([{ id: 'money', label: 'Money' }]);
    expect(filtered.getInvariants()).toEqual(db.getInvariants()); // untouched, free text
    expect(filtered.getAggregate()).toEqual(db.getAggregate());
  });

  it('hiding a value object removes only that value object', () => {
    const filtered = aggregateToggleAdapter.filter(db, new Set(['money']));
    expect(filtered.getValueObjects()).toEqual([]);
    expect(filtered.getEntities()).toHaveLength(2);
  });
});

describe('attachAggregateToggle (integration, real renderer)', () => {
  it('hiding a member removes its box and re-lays-out the grid', () => {
    const db = buildDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachAggregateToggle(svg, db, container, { panel: false });
    expect(svg.textContent).toContain('Money');

    handle.hide('money');

    expect(svg.textContent).not.toContain('Money');
    expect(svg.textContent).toContain('Order Item');
    // Invariants band is free text, unaffected by member toggles
    expect(svg.textContent).toContain('An order always has at least one item');
  });
});
