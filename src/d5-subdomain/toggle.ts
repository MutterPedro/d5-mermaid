import type { D5SubdomainReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: a `BoundedContext(...)` — hides it and any Rel touching it, grouped in the
 * checklist by its owning `Subdomain` (once there's more than one). Subdomains themselves
 * are always shown — consistent with every other view toggling the individual boxes inside
 * a container, never the container(s). */
export const subdomainToggleAdapter: ToggleAdapter<D5SubdomainReadable> = {
  items: (db) => {
    const subdomainLabel = new Map(db.getSubdomains().map((sd) => [sd.id, sd.label]));
    return db.getBoundedContexts().map((bc) => ({
      id: bc.id,
      label: bc.label,
      group: subdomainLabel.get(bc.subdomainId),
    }));
  },

  filter: (db, hidden) => {
    const boundedContexts = db.getBoundedContexts().filter((bc) => !hidden.has(bc.id));
    const visibleBcIds = new Set(boundedContexts.map((bc) => bc.id));
    const relationships = db
      .getRelationships()
      .filter((r) => visibleBcIds.has(r.source) && visibleBcIds.has(r.target));

    return {
      getTitle: () => db.getTitle(),
      getSubdomains: () => db.getSubdomains(),
      getBoundedContexts: () => boundedContexts,
      getRelationships: () => relationships,
      getDirection: () => db.getDirection(),
    };
  },
};

/** Attach a Bounded Context checklist to an already-rendered `d5-subdomain` (context map)
 * SVG. Unchecking a Bounded Context hides it and any Rel touching it, and re-lays-out the
 * rest. */
export function attachSubdomainToggle(
  svg: SVGSVGElement,
  db: D5SubdomainReadable,
  container?: HTMLElement | null,
  options?: ToggleOptions,
): ToggleHandle {
  return attachToggle(svg, db, render, subdomainToggleAdapter, container, options);
}
