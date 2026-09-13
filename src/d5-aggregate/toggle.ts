import type { D5AggregateReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: an `Entity` or `ValueObject` member, grouped in the checklist by kind.
 * `d5-aggregate` has no `Rel` (containment implies direct reference), so there are no edges
 * to drop — just the member's own box. `Invariants` are free text and always shown as
 * declared; they aren't re-derived per member. */
export const aggregateToggleAdapter: ToggleAdapter<D5AggregateReadable> = {
  items: (db) => [
    ...db.getEntities().map((e) => ({ id: e.id, label: e.label, group: 'Entities' })),
    ...db.getValueObjects().map((v) => ({ id: v.id, label: v.label, group: 'Value Objects' })),
  ],

  filter: (db, hidden) => {
    const entities = db.getEntities().filter((e) => !hidden.has(e.id));
    const valueObjects = db.getValueObjects().filter((v) => !hidden.has(v.id));

    return {
      getTitle: () => db.getTitle(),
      getAggregate: () => db.getAggregate(),
      getEntities: () => entities,
      getValueObjects: () => valueObjects,
      getInvariants: () => db.getInvariants(),
    };
  },
};

/** Attach an Entity/ValueObject checklist to an already-rendered `d5-aggregate` SVG.
 * Unchecking a member hides its box and re-lays-out the rest. */
export function attachAggregateToggle(
  svg: SVGSVGElement,
  db: D5AggregateReadable,
  container?: HTMLElement | null,
  options?: ToggleOptions,
): ToggleHandle {
  return attachToggle(svg, db, render, aggregateToggleAdapter, container, options);
}
