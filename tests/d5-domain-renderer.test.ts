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
    db.setDomain('acme', 'ACME');

    render(db, container);

    const titleEl = container.querySelector('.d5-title');
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe('My Domain');
  });

  it('renders a domain container with label', () => {
    db.setDomain('acme', 'ACME Retail');

    render(db, container);

    const domainEl = container.querySelector('.d5-domain');
    expect(domainEl).not.toBeNull();
    expect(domainEl!.textContent).toContain('ACME Retail');
  });

  it('renders subdomains with type-based CSS classes', () => {
    db.setDomain('acme', 'ACME');
    db.addSubdomain('catalog', 'Product Catalog', 'core');
    db.addSubdomain('inventory', 'Inventory', 'supporting');
    db.addSubdomain('payments', 'Payments', 'generic');

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
    db.setDomain('acme', 'ACME');
    db.addSubdomain('ordering', 'Ordering', 'core');
    db.addSubdomain('catalog', 'Catalog', 'core');
    db.addRelationship('ordering', 'catalog', 'depends on');

    render(db, container);

    const rels = container.querySelectorAll('.d5-rel');
    expect(rels).toHaveLength(1);
    expect(rels[0].textContent).toContain('depends on');
  });

  it('renders subdomain type labels', () => {
    db.setDomain('acme', 'ACME');
    db.addSubdomain('catalog', 'Product Catalog', 'core');

    render(db, container);

    const svg = container.innerHTML;
    expect(svg).toContain('core');
  });

  it('snapshot: full domain diagram', () => {
    db.setTitle('ACME Retail Platform');
    db.setDomain('acme', 'ACME Retail');
    db.addSubdomain('catalog', 'Product Catalog', 'core');
    db.addSubdomain('ordering', 'Order Management', 'core');
    db.addSubdomain('inventory', 'Inventory', 'supporting');
    db.addSubdomain('payments', 'Payments', 'generic');
    db.addRelationship('ordering', 'catalog', 'depends on');
    db.addRelationship('ordering', 'payments', 'depends on');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: minimal domain with no relationships', () => {
    db.setTitle('Simple Domain');
    db.setDomain('simple', 'Simple');
    db.addSubdomain('core1', 'Core Service', 'core');
    db.addSubdomain('support1', 'Support Service', 'supporting');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('snapshot: domain with single subdomain', () => {
    db.setDomain('mono', 'Monolith');
    db.addSubdomain('app', 'Application', 'generic');

    render(db, container);

    expect(container.innerHTML).toMatchSnapshot();
  });
});
