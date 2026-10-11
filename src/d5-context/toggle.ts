import type { D5ContextReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: an `Aggregate(...)`, `DomainService(...)` or `Process(...)`, grouped in the
 * checklist by kind — hides it and any Rel/Event/Command/Policy touching it. `Term`s (the
 * Language sidebar), `ReadModel`s, and the subject `BoundedContext` are always shown; an
 * Event into a still-visible ReadModel from a hidden Aggregate is dropped along with the
 * Aggregate, same as any other dangling edge. A neighbouring context or `Actor` isn't a
 * toggle unit, but once every edge it had is gone it is hidden rather than left stranded
 * outside the boundary (one authored with no edges at all still renders as declared). */
export const contextToggleAdapter: ToggleAdapter<D5ContextReadable> = {
  items: (db) => [
    ...db.getAggregates().map((a) => ({ id: a.id, label: a.label, group: 'Aggregates' })),
    ...db.getDomainServices().map((s) => ({ id: s.id, label: s.label, group: 'Domain Services' })),
    ...db.getProcesses().map((p) => ({ id: p.id, label: p.label, group: 'Processes' })),
  ],

  filter: (db, hidden) => {
    const aggregates = db.getAggregates().filter((a) => !hidden.has(a.id));
    const domainServices = db.getDomainServices().filter((s) => !hidden.has(s.id));
    const processes = db.getProcesses().filter((p) => !hidden.has(p.id));
    // an edge's endpoint is "still there" if it's a visible toggle unit, or something this
    // toggle never hides itself: a read model, a neighbouring context, an actor.
    const present = new Set(
      [
        ...aggregates,
        ...domainServices,
        ...processes,
        ...db.getReadModels(),
        ...db.getNeighbours(),
        ...db.getActors(),
      ].map((n) => n.id),
    );
    const visible = <E extends { source: string; target: string }>(edges: E[]): E[] =>
      edges.filter((e) => present.has(e.source) && present.has(e.target));

    const relationships = visible(db.getRelationships());
    const events = visible(db.getEvents());
    const policies = visible(db.getPolicies());
    const commands = visible(db.getCommands());

    const touched = (edges: { source: string; target: string }[]): Set<string> =>
      new Set(edges.flatMap((e) => [e.source, e.target]));
    const before = touched([
      ...db.getRelationships(),
      ...db.getEvents(),
      ...db.getPolicies(),
      ...db.getCommands(),
    ]);
    const after = touched([...relationships, ...events, ...policies, ...commands]);
    const stranded = (id: string): boolean => before.has(id) && !after.has(id);
    const neighbours = db.getNeighbours().filter((n) => !stranded(n.id));
    const actors = db.getActors().filter((a) => !stranded(a.id));

    return {
      getTitle: () => db.getTitle(),
      getBoundedContext: () => db.getBoundedContext(),
      getAggregates: () => aggregates,
      getTerms: () => db.getTerms(),
      getRelationships: () => relationships,
      getEvents: () => events,
      getPolicies: () => policies,
      getReadModels: () => db.getReadModels(),
      getDomainServices: () => domainServices,
      getProcesses: () => processes,
      getNeighbours: () => neighbours,
      getActors: () => actors,
      getCommands: () => commands,
      getDirection: () => db.getDirection(),
    };
  },
};

/** Attach an Aggregate / DomainService / Process checklist to an already-rendered
 * `d5-context` SVG. Unchecking one hides it and any Rel/Event/Command/Policy touching it,
 * and re-lays-out the rest. */
export function attachContextToggle(
  svg: SVGSVGElement,
  db: D5ContextReadable,
  container?: HTMLElement | null,
  options?: ToggleOptions,
): ToggleHandle {
  return attachToggle(svg, db, render, contextToggleAdapter, container, options);
}
