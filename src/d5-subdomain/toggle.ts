import type { D5SubdomainReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: a `Subdomain(...)` block — hides it, its Bounded Contexts, and any Rel
 * touching one of them. */
export const subdomainToggleAdapter: ToggleAdapter<D5SubdomainReadable> = {
  items: (db) => db.getSubdomains().map((sd) => ({ id: sd.id, label: sd.label })),

  filter: (db, hidden) => {
    const subdomains = db.getSubdomains().filter((sd) => !hidden.has(sd.id));
    const boundedContexts = db.getBoundedContexts().filter((bc) => !hidden.has(bc.subdomainId));
    const visibleBcIds = new Set(boundedContexts.map((bc) => bc.id));
    const relationships = db
      .getRelationships()
      .filter((r) => visibleBcIds.has(r.source) && visibleBcIds.has(r.target));

    return {
      getTitle: () => db.getTitle(),
      getSubdomains: () => subdomains,
      getBoundedContexts: () => boundedContexts,
      getRelationships: () => relationships,
      getDirection: () => db.getDirection(),
    };
  },
};

/** Attach a Subdomain checklist to an already-rendered `d5-subdomain` (context map) SVG.
 * Unchecking a Subdomain hides it, its Bounded Contexts, and any Rel touching one, and
 * re-lays-out the rest. */
export function attachSubdomainToggle(
  svg: SVGSVGElement,
  db: D5SubdomainReadable,
  container?: HTMLElement | null,
  options?: ToggleOptions,
): ToggleHandle {
  return attachToggle(svg, db, render, subdomainToggleAdapter, container, options);
}
