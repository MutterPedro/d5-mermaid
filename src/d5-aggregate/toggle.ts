import type { D5AggregateReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: an `Entity` or `ValueObject` member, grouped in the checklist by kind —
 * hides its box and any `Has`/`Ref` touching it. A referenced aggregate outside the boundary
 * isn't a toggle unit, but once every `Ref` to it is gone it is hidden too. `Invariants`,
 * the `Lifecycle` and the commands/events are the aggregate's own and always shown as
 * declared; they aren't re-derived per member. */
export const aggregateToggleAdapter: ToggleAdapter<D5AggregateReadable> = {
  items: (db) => [
    ...db.getEntities().map((e) => ({ id: e.id, label: e.label, group: 'Entities' })),
    ...db.getValueObjects().map((v) => ({ id: v.id, label: v.label, group: 'Value Objects' })),
  ],

  filter: (db, hidden) => {
    const entities = db.getEntities().filter((e) => !hidden.has(e.id));
    const valueObjects = db.getValueObjects().filter((v) => !hidden.has(v.id));

    const present = new Set([...entities, ...valueObjects].map((m) => m.id));
    const has = db.getHas().filter((h) => present.has(h.owner) && present.has(h.part));
    const refs = db.getRefs().filter((r) => present.has(r.source));
    const referenced = (all: { target: string }[]): Set<string> => new Set(all.map((r) => r.target));
    const before = referenced(db.getRefs());
    const after = referenced(refs);
    const neighbours = db.getNeighbours().filter((n) => !before.has(n.id) || after.has(n.id));

    return {
      getTitle: () => db.getTitle(),
      getAggregate: () => db.getAggregate(),
      getEntities: () => entities,
      getValueObjects: () => valueObjects,
      getInvariants: () => db.getInvariants(),
      getHas: () => has,
      getRefs: () => refs,
      getNeighbours: () => neighbours,
      getCommands: () => db.getCommands(),
      getEvents: () => db.getEvents(),
      getEmits: () => db.getEmits(),
      getStates: () => db.getStates(),
      getTransitions: () => db.getTransitions(),
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
