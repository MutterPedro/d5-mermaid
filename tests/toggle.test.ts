import { describe, it, expect, beforeEach } from 'vitest';
import { attachToggle, type ToggleAdapter } from '../src/shared/toggle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// A minimal fake "diagram" to exercise the engine without depending on any real D5
// renderer: a db is just a list of {id, label} items, and rendering draws one <g> per item.
interface FakeItem {
  id: string;
  label: string;
}
interface FakeDb {
  items: FakeItem[];
}

let renderCalls: FakeDb[] = [];

function fakeRender(db: FakeDb, container: SVGSVGElement): void {
  renderCalls.push(db);
  db.items.forEach((item) => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'item');
    g.setAttribute('data-id', item.id);
    g.textContent = item.label;
    container.appendChild(g);
  });
}

const fakeAdapter: ToggleAdapter<FakeDb> = {
  items: (db) => db.items.map((i) => ({ id: i.id, label: i.label })),
  filter: (db, hidden) => ({ items: db.items.filter((i) => !hidden.has(i.id)) }),
};

function setUp(itemCount = 3) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  container.appendChild(svg);
  const db: FakeDb = {
    items: Array.from({ length: itemCount }, (_, i) => ({ id: `item${i}`, label: `Item ${i}` })),
  };
  return { container, svg, db };
}

function renderedIds(svg: SVGSVGElement): string[] {
  return Array.from(svg.querySelectorAll('.item')).map((el) => el.getAttribute('data-id')!);
}

function checkboxes(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('[data-d5-toggle-panel] input[type="checkbox"]'));
}

describe('attachToggle', () => {
  beforeEach(() => {
    renderCalls = [];
  });

  it('renders every item on attach', () => {
    const { svg, db } = setUp();
    attachToggle(svg, db, fakeRender, fakeAdapter);
    expect(renderedIds(svg)).toEqual(['item0', 'item1', 'item2']);
  });

  it('builds a checklist panel with one checked checkbox per item, in item order', () => {
    const { container, svg, db } = setUp();
    attachToggle(svg, db, fakeRender, fakeAdapter);
    const boxes = checkboxes(container);
    expect(boxes).toHaveLength(3);
    expect(boxes.every((b) => b.checked)).toBe(true);
    expect(container.textContent).toContain('Item 0');
    expect(container.textContent).toContain('Item 1');
    expect(container.textContent).toContain('Item 2');
  });

  it('hide(id) removes that item and re-renders the rest, unchecking its box', () => {
    const { container, svg, db } = setUp();
    const handle = attachToggle(svg, db, fakeRender, fakeAdapter);

    handle.hide('item1');

    expect(renderedIds(svg)).toEqual(['item0', 'item2']);
    expect(handle.isVisible('item1')).toBe(false);
    expect(handle.getHiddenIds()).toEqual(new Set(['item1']));
    const box = checkboxes(container).find((b) => b.closest('label')?.textContent?.includes('Item 1'));
    expect(box!.checked).toBe(false);
  });

  it('show(id) restores a hidden item', () => {
    const { svg, db } = setUp();
    const handle = attachToggle(svg, db, fakeRender, fakeAdapter, undefined, { initiallyHidden: ['item0'] });

    expect(renderedIds(svg)).toEqual(['item1', 'item2']);
    handle.show('item0');
    expect(renderedIds(svg)).toEqual(['item0', 'item1', 'item2']);
    expect(handle.isVisible('item0')).toBe(true);
  });

  it('toggle(id) flips current visibility', () => {
    const { svg, db } = setUp();
    const handle = attachToggle(svg, db, fakeRender, fakeAdapter);

    handle.toggle('item2');
    expect(handle.isVisible('item2')).toBe(false);
    handle.toggle('item2');
    expect(handle.isVisible('item2')).toBe(true);
  });

  it('unchecking a checkbox in the panel drives the same hide behavior', () => {
    const { container, svg } = setUp();
    const db: FakeDb = { items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] };
    attachToggle(svg, db, fakeRender, fakeAdapter);

    const boxA = checkboxes(container)[0];
    boxA.checked = false;
    boxA.dispatchEvent(new Event('change', { bubbles: true }));

    expect(renderedIds(svg)).toEqual(['b']);
  });

  it('starts with initiallyHidden ids unchecked and not rendered', () => {
    const { container, svg, db } = setUp();
    const handle = attachToggle(svg, db, fakeRender, fakeAdapter, undefined, {
      initiallyHidden: ['item0', 'item2'],
    });

    expect(renderedIds(svg)).toEqual(['item1']);
    expect(handle.getHiddenIds()).toEqual(new Set(['item0', 'item2']));
    const boxes = checkboxes(container);
    expect(boxes.filter((b) => b.checked)).toHaveLength(1);
  });

  it('calls onChange with the visible id set after the initial render and every toggle', () => {
    const { svg, db } = setUp();
    const seen: Set<string>[] = [];
    const handle = attachToggle(svg, db, fakeRender, fakeAdapter, undefined, {
      onChange: (visible) => seen.push(new Set(visible)),
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(new Set(['item0', 'item1', 'item2']));

    handle.hide('item1');
    expect(seen).toHaveLength(2);
    expect(seen[1]).toEqual(new Set(['item0', 'item2']));
  });

  it('passes a filtered db to render — the original db object is never mutated', () => {
    const { svg, db } = setUp();
    const originalItems = db.items;
    const handle = attachToggle(svg, db, fakeRender, fakeAdapter);

    handle.hide('item0');

    expect(db.items).toBe(originalItems); // untouched
    expect(db.items).toHaveLength(3);
    expect(renderCalls.at(-1)!.items.map((i) => i.id)).toEqual(['item1', 'item2']);
  });

  it('panel: false skips building the checklist UI entirely', () => {
    const { container, svg, db } = setUp();
    attachToggle(svg, db, fakeRender, fakeAdapter, undefined, { panel: false });
    expect(container.querySelector('[data-d5-toggle-panel]')).toBeNull();
  });

  it('skips the panel when there are no toggle-able items, even with panel: true', () => {
    const { container, svg } = setUp(0);
    const db: FakeDb = { items: [] };
    attachToggle(svg, db, fakeRender, fakeAdapter, undefined, { panel: true });
    expect(container.querySelector('[data-d5-toggle-panel]')).toBeNull();
  });

  it('panelTitle overrides the default heading text', () => {
    const { container, svg, db } = setUp();
    attachToggle(svg, db, fakeRender, fakeAdapter, undefined, { panelTitle: 'Custom Heading' });
    expect(container.querySelector('[data-d5-toggle-panel]')!.textContent).toContain('Custom Heading');
  });

  it('destroy() removes the panel; API calls still re-render without throwing', () => {
    const { container, svg, db } = setUp();
    const handle = attachToggle(svg, db, fakeRender, fakeAdapter);

    handle.destroy();
    expect(container.querySelector('[data-d5-toggle-panel]')).toBeNull();

    expect(() => handle.hide('item0')).not.toThrow();
    expect(renderedIds(svg)).toEqual(['item1', 'item2']);
  });

  it('throws a clear error when there is no container to attach to', () => {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement; // no parent
    const db: FakeDb = { items: [] };
    expect(() => attachToggle(svg, db, fakeRender, fakeAdapter)).toThrow(/no container/i);
  });
});
