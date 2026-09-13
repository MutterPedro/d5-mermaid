import { describe, it, expect, beforeEach } from 'vitest';
import { D5DomainDb } from '../src/d5-domain/db.js';
import { attachDomainToggle, domainToggleAdapter } from '../src/d5-domain/toggle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildTwoDomainDb(): D5DomainDb {
  const db = new D5DomainDb();
  db.addDomain('mobility', 'Mobility');
  db.addSubdomain('ride_matching', 'Ride Matching', 'core', 'mobility');
  db.addSubdomain('driver_identity', 'Driver Identity', 'generic', 'mobility');
  db.addDomain('delivery', 'Delivery');
  db.addSubdomain('courier_dispatch', 'Courier Dispatch', 'core', 'delivery');
  db.addRelationship('ride_matching', 'driver_identity', 'uses'); // intra-domain
  db.addRelationship('courier_dispatch', 'driver_identity', 'authenticates via'); // cross-domain
  return db;
}

describe('domainToggleAdapter', () => {
  let db: D5DomainDb;

  beforeEach(() => {
    db = buildTwoDomainDb();
  });

  it('lists each Domain as a toggle item', () => {
    expect(domainToggleAdapter.items(db)).toEqual([
      { id: 'mobility', label: 'Mobility' },
      { id: 'delivery', label: 'Delivery' },
    ]);
  });

  it('hiding a domain drops its subdomains and any Rel touching one of them', () => {
    const filtered = domainToggleAdapter.filter(db, new Set(['mobility']));

    expect(filtered.getDomains()).toEqual([{ id: 'delivery', label: 'Delivery' }]);
    expect(filtered.getSubdomains().map((s) => s.id)).toEqual(['courier_dispatch']);
    // both rels touched mobility (either directly, or via driver_identity) -> both gone
    expect(filtered.getRelationships()).toEqual([]);
  });

  it('hiding the other domain leaves the purely-intra-domain rel of the remaining one intact', () => {
    const filtered = domainToggleAdapter.filter(db, new Set(['delivery']));

    expect(filtered.getDomains()).toEqual([{ id: 'mobility', label: 'Mobility' }]);
    expect(filtered.getSubdomains().map((s) => s.id).sort()).toEqual(['driver_identity', 'ride_matching']);
    expect(filtered.getRelationships()).toEqual([
      { source: 'ride_matching', target: 'driver_identity', label: 'uses' },
    ]);
  });

  it('passes direction/title through unchanged', () => {
    db.setTitle('Two Domains');
    db.setDirection('LR');
    const filtered = domainToggleAdapter.filter(db, new Set());
    expect(filtered.getTitle()).toBe('Two Domains');
    expect(filtered.getDirection()).toBe('LR');
  });
});

describe('attachDomainToggle (integration, real renderer)', () => {
  it('hiding a domain removes its .d5-domain / .d5-subdomain groups and re-lays-out the rest', () => {
    const db = buildTwoDomainDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachDomainToggle(svg, db, container, { panel: false });
    expect(svg.querySelectorAll('.d5-domain')).toHaveLength(2);
    expect(svg.querySelectorAll('.d5-subdomain')).toHaveLength(3);

    handle.hide('mobility');

    expect(svg.querySelectorAll('.d5-domain')).toHaveLength(1);
    const subdomainIds = Array.from(svg.querySelectorAll('.d5-subdomain')).map((el) => el.textContent);
    expect(subdomainIds.join(' ')).toContain('Courier Dispatch');
    expect(subdomainIds.join(' ')).not.toContain('Ride Matching');
    // both edges touched the hidden domain (one directly, one via driver_identity)
    expect(svg.querySelectorAll('.d5-rel')).toHaveLength(0);

    handle.show('mobility');
    expect(svg.querySelectorAll('.d5-domain')).toHaveLength(2);
    expect(svg.querySelectorAll('.d5-subdomain')).toHaveLength(3);
  });

  it('renders a checklist panel with one row per Domain by default', () => {
    const db = buildTwoDomainDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    attachDomainToggle(svg, db, container);

    const boxes = container.querySelectorAll('[data-d5-toggle-panel] input[type="checkbox"]');
    expect(boxes).toHaveLength(2);
    expect(container.querySelector('[data-d5-toggle-panel]')!.textContent).toContain('Mobility');
    expect(container.querySelector('[data-d5-toggle-panel]')!.textContent).toContain('Delivery');
  });
});
