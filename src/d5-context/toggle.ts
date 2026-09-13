import type { D5ContextReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: an `Aggregate(...)` — hides it and any Rel/Event/Policy touching it.
 * `Term`s (the Language sidebar), `ReadModel`s, and the single `BoundedContext` are always
 * shown; an Event into a still-visible ReadModel from a hidden Aggregate is dropped along
 * with the Aggregate, same as any other dangling edge. */
export const contextToggleAdapter: ToggleAdapter<D5ContextReadable> = {
  items: (db) => db.getAggregates().map((a) => ({ id: a.id, label: a.label })),

  filter: (db, hidden) => {
    const aggregates = db.getAggregates().filter((a) => !hidden.has(a.id));
    const visibleAggregateIds = new Set(aggregates.map((a) => a.id));
    const readModelIds = new Set(db.getReadModels().map((rm) => rm.id));
    // an edge's endpoint is "still there" if it's a visible aggregate, or (for a target) a
    // read model — read models are never hidden by this toggle.
    const endpointVisible = (id: string): boolean => visibleAggregateIds.has(id) || readModelIds.has(id);

    const relationships = db
      .getRelationships()
      .filter((r) => visibleAggregateIds.has(r.source) && visibleAggregateIds.has(r.target));
    const events = db.getEvents().filter((e) => visibleAggregateIds.has(e.source) && endpointVisible(e.target));
    const policies = db
      .getPolicies()
      .filter((p) => visibleAggregateIds.has(p.source) && visibleAggregateIds.has(p.target));

    return {
      getTitle: () => db.getTitle(),
      getBoundedContext: () => db.getBoundedContext(),
      getAggregates: () => aggregates,
      getTerms: () => db.getTerms(),
      getRelationships: () => relationships,
      getEvents: () => events,
      getPolicies: () => policies,
      getReadModels: () => db.getReadModels(),
      getDirection: () => db.getDirection(),
    };
  },
};

/** Attach an Aggregate checklist to an already-rendered `d5-context` SVG. Unchecking an
 * Aggregate hides it and any Rel/Event/Policy touching it, and re-lays-out the rest. */
export function attachContextToggle(
  svg: SVGSVGElement,
  db: D5ContextReadable,
  container?: HTMLElement | null,
  options?: ToggleOptions,
): ToggleHandle {
  return attachToggle(svg, db, render, contextToggleAdapter, container, options);
}
