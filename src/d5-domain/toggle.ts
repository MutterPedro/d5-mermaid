import type { D5DomainReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: a `Domain(...)` block — hides it, its Subdomains, and any Rel touching one. */
export const domainToggleAdapter: ToggleAdapter<D5DomainReadable> = {
  items: (db) => db.getDomains().map((d) => ({ id: d.id, label: d.label })),

  filter: (db, hidden) => {
    const domains = db.getDomains().filter((d) => !hidden.has(d.id));
    const subdomains = db.getSubdomains().filter((sd) => !hidden.has(sd.domainId));
    const visibleSubdomainIds = new Set(subdomains.map((sd) => sd.id));
    const relationships = db
      .getRelationships()
      .filter((r) => visibleSubdomainIds.has(r.source) && visibleSubdomainIds.has(r.target));

    return {
      getDomains: () => domains,
      getSubdomains: () => subdomains,
      getRelationships: () => relationships,
      getDirection: () => db.getDirection(),
      getTitle: () => db.getTitle(),
    };
  },
};

/** Attach a Domain checklist to an already-rendered `d5-domain` SVG. Unchecking a Domain
 * hides it, its Subdomains, and any Rel touching one, and re-lays-out the rest. */
export function attachDomainToggle(
  svg: SVGSVGElement,
  db: D5DomainReadable,
  container?: HTMLElement | null,
  options?: ToggleOptions,
): ToggleHandle {
  return attachToggle(svg, db, render, domainToggleAdapter, container, options);
}
