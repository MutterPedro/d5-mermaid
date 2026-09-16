import { describe, it, expect, beforeEach } from 'vitest';
import { D5DomainDb } from '../src/d5-domain/db.js';
import { render } from '../src/d5-domain/renderer.js';

describe('d5-domain renderer', () => {
  let db: D5DomainDb;
  let container: SVGSVGElement;

  beforeEach(() => {
    db = new D5DomainDb();
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.setAttribute('id', 'test-svg');
    document.body.appendChild(container);
  });

  it('renders a title element', () => {
    db.setTitle('My Domain');
    db.addDomain('acme', 'ACME');

    render(db, container);

    const titleEl = container.querySelector('.d5-title');
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe('My Domain');
  });

  it('renders a domain container with label', () => {
    db.addDomain('acme', 'ACME Retail');

    render(db, container);

    const domainEl = container.querySelector('.d5-domain');
    expect(domainEl).not.toBeNull();
    expect(domainEl!.textContent).toContain('ACME Retail');
  });

  it('renders subdomains with type-based CSS classes', () => {
    db.addDomain('acme', 'ACME');
    db.addSubdomain('catalog', 'Product Catalog', 'core', 'acme');
    db.addSubdomain('inventory', 'Inventory', 'supporting', 'acme');
    db.addSubdomain('payments', 'Payments', 'generic', 'acme');

    render(db, container);

    const subdomains = container.querySelectorAll('.d5-subdomain');
    expect(subdomains).toHaveLength(3);

    // Each subdomain should have a type class
    const classes = Array.from(subdomains).map(el => el.getAttribute('class'));
    expect(classes[0]).toContain('d5-subdomain-core');
    expect(classes[1]).toContain('d5-subdomain-supporting');
    expect(classes[2]).toContain('d5-subdomain-generic');

    // Each subdomain should display its label
    expect(subdomains[0].textContent).toContain('Product Catalog');
    expect(subdomains[1].textContent).toContain('Inventory');
    expect(subdomains[2].textContent).toContain('Payments');
  });

  it('renders relationships as labeled edges', () => {
    db.addDomain('acme', 'ACME');
    db.addSubdomain('ordering', 'Ordering', 'core', 'acme');
    db.addSubdomain('catalog', 'Catalog', 'core', 'acme');
    db.addRelationship('ordering', 'catalog', 'depends on');

    render(db, container);

    const rels = container.querySelectorAll('.d5-rel');
    expect(rels).toHaveLength(1);
    expect(rels[0].textContent).toContain('depends on');
  });

  it('renders subdomain type labels', () => {
    db.addDomain('acme', 'ACME');
    db.addSubdomain('catalog', 'Product Catalog', 'core', 'acme');

    render(db, container);

    const svg = container.innerHTML;
    expect(svg).toContain('core');
  });

  describe('multiple domains', () => {
    beforeEach(() => {
      db.addDomain('sales', 'Sales');
      db.addSubdomain('storefront', 'Storefront', 'core', 'sales');
      db.addDomain('fulfillment', 'Fulfillment');
      db.addSubdomain('warehouse', 'Warehouse', 'supporting', 'fulfillment');
    });

    it('renders one .d5-domain container per Domain block', () => {
      render(db, container);

      const domainEls = container.querySelectorAll('.d5-domain');
      expect(domainEls).toHaveLength(2);
      expect(domainEls[0].textContent).toContain('Sales');
      expect(domainEls[1].textContent).toContain('Fulfillment');
    });

    it('renders subdomains from every domain', () => {
      render(db, container);

      const subdomains = container.querySelectorAll('.d5-subdomain');
      expect(subdomains).toHaveLength(2);
      expect(subdomains[0].textContent).toContain('Storefront');
      expect(subdomains[1].textContent).toContain('Warehouse');
    });

    it('stacks domain boxes without overlapping (second domain starts below the first)', () => {
      render(db, container);

      const rects = Array.from(container.querySelectorAll('.d5-domain rect'));
      expect(rects).toHaveLength(2);
      const first = rects[0] as SVGRectElement;
      const second = rects[1] as SVGRectElement;
      const firstBottom = Number(first.getAttribute('y')) + Number(first.getAttribute('height'));
      const secondTop = Number(second.getAttribute('y'));
      expect(secondTop).toBeGreaterThanOrEqual(firstBottom);
    });

    it('renders a cross-domain relationship as a labeled edge', () => {
      db.addRelationship('warehouse', 'storefront', 'ships orders placed in');

      render(db, container);

      const crossRels = container.querySelectorAll('.d5-rel-cross');
      expect(crossRels).toHaveLength(1);
      expect(crossRels[0].textContent).toContain('ships orders placed in');
    });

    it('snapshot: two domains with a cross-domain relationship', () => {
      db.setTitle('Two Domains');
      db.addRelationship('warehouse', 'storefront', 'ships orders placed in');

      render(db, container);

      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it('snapshot: full domain diagram', () => {
    db.setTitle('ACME Retail Platform');
    db.addDomain('acme', 'ACME Retail');
    db.addSubdomain('catalog', 'Product Catalog', 'core', 'acme');
    db.addSubdomain('ordering', 'Order Management', 'core', 'acme');
    db.addSubdomain('inventory', 'Inventory', 'supporting', 'acme');
    db.addSubdomain('payments', 'Payments', 'generic', 'acme');
    db.addRelationship('ordering', 'catalog', 'depends on');
    db.addRelationship('ordering', 'payments', 'depends on');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: minimal domain with no relationships', () => {
    db.setTitle('Simple Domain');
    db.addDomain('simple', 'Simple');
    db.addSubdomain('core1', 'Core Service', 'core', 'simple');
    db.addSubdomain('support1', 'Support Service', 'supporting', 'simple');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: domain with single subdomain', () => {
    db.addDomain('mono', 'Monolith');
    db.addSubdomain('app', 'Application', 'generic', 'mono');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  // Regression test for a real bug spotted by hand: "a direct cycle from 2 subdomains in
  // different domains... the arrows overlap each other almost completely". A->B and B->A
  // between the same pair of Subdomains clip to the same two points on the same straight
  // line — the two edges (and their labels) drew on top of each other. Cross-domain edges
  // sharing a pair now bow apart instead.
  describe('a direct two-way relationship between Subdomains in different Domains', () => {
    function buildTwoWayDb(): D5DomainDb {
      const db = new D5DomainDb();
      db.setTitle('Direct Cycle');
      db.addDomain('d1', 'Domain One');
      db.addSubdomain('a', 'Subdomain A', 'core', 'd1');
      db.addDomain('d2', 'Domain Two');
      db.addSubdomain('b', 'Subdomain B', 'core', 'd2');
      db.addRelationship('a', 'b', 'calls');
      db.addRelationship('b', 'a', 'calls back');
      return db;
    }

    function pathPoints(d: string): { x: number; y: number }[] {
      // "M x y Q cx cy mx my L ex ey" or "M x y L ex ey" — pull out every x/y pair in order.
      const nums = d.match(/-?[\d.]+/g)!.map(Number);
      const pts = [];
      for (let i = 0; i < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
      return pts;
    }

    it('draws the two edges as visibly distinct curves, not one line traced twice', () => {
      const db = buildTwoWayDb();
      render(db, container);

      const paths = Array.from(container.querySelectorAll('.d5-rel-cross path')) as SVGPathElement[];
      expect(paths).toHaveLength(2);

      const [p1, p2] = paths.map((p) => pathPoints(p.getAttribute('d')!));
      // same endpoints (same pair, clipped to the same two boxes)...
      expect(p1[0]).toEqual(p2[p2.length - 1]);
      expect(p1[p1.length - 1]).toEqual(p2[0]);
      // ...but bowed through *different* midpoints, not the same straight line.
      const mid1 = p1[Math.floor(p1.length / 2)];
      const mid2 = p2[Math.floor(p2.length / 2)];
      const separation = Math.hypot(mid1.x - mid2.x, mid1.y - mid2.y);
      expect(separation).toBeGreaterThan(20);
    });

    it("does not overlap the two edges' labels", () => {
      const db = buildTwoWayDb();
      render(db, container);

      const rects = Array.from(container.querySelectorAll('.d5-rel-cross .d5-edge-label rect'));
      expect(rects).toHaveLength(2);
      const spans = rects.map((r) => {
        const x1 = Number(r.getAttribute('x'));
        return [x1, x1 + Number(r.getAttribute('width'))] as const;
      });
      const [[a1, a2], [b1, b2]] = spans;
      const overlaps = a1 < b2 && b1 < a2;
      expect(overlaps).toBe(false);
    });

    it('a single (one-way) cross-domain relationship is unaffected — still a plain straight line', () => {
      const db = new D5DomainDb();
      db.addDomain('d1', 'Domain One');
      db.addSubdomain('a', 'Subdomain A', 'core', 'd1');
      db.addDomain('d2', 'Domain Two');
      db.addSubdomain('b', 'Subdomain B', 'core', 'd2');
      db.addRelationship('a', 'b', 'calls');

      render(db, container);

      const paths = Array.from(container.querySelectorAll('.d5-rel-cross path')) as SVGPathElement[];
      expect(paths).toHaveLength(1);
      expect(pathPoints(paths[0].getAttribute('d')!)).toHaveLength(2); // "M x y L x y" only
    });
  });
});
