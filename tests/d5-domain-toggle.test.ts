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

  it('lists each Subdomain as a toggle item, grouped by its owning Domain', () => {
    expect(domainToggleAdapter.items(db)).toEqual([
      { id: 'ride_matching', label: 'Ride Matching', group: 'Mobility' },
      { id: 'driver_identity', label: 'Driver Identity', group: 'Mobility' },
      { id: 'courier_dispatch', label: 'Courier Dispatch', group: 'Delivery' },
    ]);
  });

  it('hiding a subdomain drops any Rel touching it, but never a Domain itself', () => {
    const filtered = domainToggleAdapter.filter(db, new Set(['driver_identity']));

    expect(filtered.getDomains()).toEqual([
      { id: 'mobility', label: 'Mobility' },
      { id: 'delivery', label: 'Delivery' },
    ]); // both domains always stay
    expect(filtered.getSubdomains().map((s) => s.id).sort()).toEqual(['courier_dispatch', 'ride_matching']);
    // both rels touched driver_identity -> both gone
    expect(filtered.getRelationships()).toEqual([]);
  });

  it('hiding a subdomain with no cross-domain rel only drops rels touching it', () => {
    const filtered = domainToggleAdapter.filter(db, new Set(['courier_dispatch']));

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
  it('hiding a subdomain removes its .d5-subdomain group and any Rel touching it, keeps both Domains', () => {
    const db = buildTwoDomainDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachDomainToggle(svg, db, container, { panel: false });
    expect(svg.querySelectorAll('.d5-domain')).toHaveLength(2);
    expect(svg.querySelectorAll('.d5-subdomain')).toHaveLength(3);

    handle.hide('driver_identity');

    // both domains stay — only the hidden subdomain is gone
    expect(svg.querySelectorAll('.d5-domain')).toHaveLength(2);
    const subdomainText = Array.from(svg.querySelectorAll('.d5-subdomain')).map((el) => el.textContent).join(' ');
    expect(subdomainText).toContain('Ride Matching');
    expect(subdomainText).toContain('Courier Dispatch');
    expect(subdomainText).not.toContain('Driver Identity');
    // both edges touched the hidden subdomain
    expect(svg.querySelectorAll('.d5-rel')).toHaveLength(0);

    handle.show('driver_identity');
    expect(svg.querySelectorAll('.d5-domain')).toHaveLength(2);
    expect(svg.querySelectorAll('.d5-subdomain')).toHaveLength(3);
  });

  // Regression test for a real bug caught hand-testing Example 8 (Uber Mobility & Delivery)
  // in the browser: hiding every Subdomain of one Domain broke the *whole* diagram, not
  // just that Domain's box. Root cause: `dagre.layout()` on a Domain's now-empty local
  // graph reports `graph().width`/`.height` as `-Infinity`, not `0` — the `|| 0` fallback
  // doesn't catch it because `-Infinity` is truthy in JS. That `-Infinity` became that
  // Domain's box width/height, and since Domains stack by adding each one's height to a
  // running total, it poisoned every Domain stacked after it too. Fixed with `finiteOr0()`
  // (src/shared/shape.ts), shared by every renderer with this exact `dagre.layout()` +
  // `graph().width || 0` pattern (also found and fixed in d5-subdomain and d5-context).
  it('hiding every Subdomain of one Domain leaves a sane empty box, not -Infinity, and does not break the other Domain', () => {
    const db = buildTwoDomainDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    const handle = attachDomainToggle(svg, db, container, { panel: false });
    handle.hide('ride_matching');
    handle.hide('driver_identity'); // both of mobility's subdomains now hidden

    expect(svg.outerHTML).not.toContain('Infinity');
    expect(svg.querySelectorAll('.d5-domain')).toHaveLength(2);

    const rects = Array.from(svg.querySelectorAll('.d5-domain rect')) as SVGRectElement[];
    rects.forEach((r) => {
      expect(Number(r.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(r.getAttribute('height'))).toBeGreaterThan(0);
    });

    // delivery's still-visible subdomain rendered with a real, positive size too
    const deliveryBox = Array.from(svg.querySelectorAll('.d5-subdomain')).find((el) =>
      el.textContent?.includes('Courier Dispatch'),
    )!;
    const deliveryRect = deliveryBox.querySelector('rect')!;
    expect(Number(deliveryRect.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(deliveryRect.getAttribute('height'))).toBeGreaterThan(0);

    const [, , vbWidth, vbHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(Number.isFinite(vbWidth) && vbWidth > 0).toBe(true);
    expect(Number.isFinite(vbHeight) && vbHeight > 0).toBe(true);
  });

  it('renders a checklist panel grouped by Domain, with one row per Subdomain', () => {
    const db = buildTwoDomainDb();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    attachDomainToggle(svg, db, container);

    // 3 Subdomain checkboxes + 1 "select all" checkbox per Domain group (2 Domains)
    const boxes = container.querySelectorAll('[data-d5-toggle-panel] input[type="checkbox"]');
    expect(boxes).toHaveLength(5);
    const panelText = container.querySelector('[data-d5-toggle-panel]')!.textContent!;
    expect(panelText).toContain('Mobility');
    expect(panelText).toContain('Delivery');
    expect(panelText).toContain('Ride Matching');
    expect(panelText).toContain('Courier Dispatch');
  });

  it('renders a flat (ungrouped) checklist for a single-Domain diagram', () => {
    const db = new D5DomainDb();
    db.addDomain('acme', 'ACME');
    db.addSubdomain('catalog', 'Catalog', 'core', 'acme');
    db.addSubdomain('ordering', 'Ordering', 'core', 'acme');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    container.appendChild(svg);

    attachDomainToggle(svg, db, container);

    expect(container.querySelector('[data-d5-toggle-panel]')!.textContent).not.toContain('ACME');
    expect(container.querySelectorAll('[data-d5-toggle-panel] input[type="checkbox"]')).toHaveLength(2);
  });
});
