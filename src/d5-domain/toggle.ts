import type { D5DomainReadable } from './db.js';
import { render } from './renderer.js';
import { attachToggle, type ToggleAdapter, type ToggleOptions, type ToggleHandle } from '../shared/toggle.js';

/** Toggle unit: a `Subdomain(...)` — hides it and any Rel touching it, grouped in the
 * checklist by its owning `Domain` (once there's more than one). Domains aren't toggle units
 * themselves — consistent with every other view toggling the individual boxes inside a
 * container — but a Domain whose every Subdomain is hidden is dropped along with them,
 * rather than left behind as an empty box. A Domain *authored* with no Subdomains stays. */
export const domainToggleAdapter: ToggleAdapter<D5DomainReadable> = {
  items: (db) => {
    const domainLabel = new Map(db.getDomains().map((d) => [d.id, d.label]));
    return db.getSubdomains().map((sd) => ({
      id: sd.id,
      label: sd.label,
      group: domainLabel.get(sd.domainId),
    }));
  },

  filter: (db, hidden) => {
    const subdomains = db.getSubdomains().filter((sd) => !hidden.has(sd.id));
    const visibleSubdomainIds = new Set(subdomains.map((sd) => sd.id));
    const authoredDomainIds = new Set(db.getSubdomains().map((sd) => sd.domainId));
    const visibleDomainIds = new Set(subdomains.map((sd) => sd.domainId));
    const domains = db
      .getDomains()
      .filter((d) => !authoredDomainIds.has(d.id) || visibleDomainIds.has(d.id));
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

/** Attach a Subdomain checklist to an already-rendered `d5-domain` SVG. Unchecking a
 * Subdomain hides it and any Rel touching it, and re-lays-out the rest. */
export function attachDomainToggle(
  svg: SVGSVGElement,
  db: D5DomainReadable,
  container?: HTMLElement | null,
  options?: ToggleOptions,
): ToggleHandle {
  return attachToggle(svg, db, render, domainToggleAdapter, container, options);
}
