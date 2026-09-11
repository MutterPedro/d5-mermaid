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
});
