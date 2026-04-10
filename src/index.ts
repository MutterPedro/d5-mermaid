// D5 Mermaid Extension — entry point
// Exports ExternalDiagramDefinition objects for registration with Mermaid.js

import { detectDomain } from './d5-domain/detector.js';
import { D5DomainDb } from './d5-domain/db.js';
import { parse as parseDomain } from './d5-domain/parser.js';
import { render as renderDomain } from './d5-domain/renderer.js';

import { detectSubdomain } from './d5-subdomain/detector.js';
import { D5SubdomainDb } from './d5-subdomain/db.js';
import { parse as parseSubdomain } from './d5-subdomain/parser.js';
import { render as renderSubdomain } from './d5-subdomain/renderer.js';

import { detectContext } from './d5-context/detector.js';
import { D5ContextDb } from './d5-context/db.js';
import { parse as parseContext } from './d5-context/parser.js';
import { render as renderContext } from './d5-context/renderer.js';

import { detectAggregate } from './d5-aggregate/detector.js';
import { D5AggregateDb } from './d5-aggregate/db.js';
import { parse as parseAggregate } from './d5-aggregate/parser.js';
import { render as renderAggregate } from './d5-aggregate/renderer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createRenderer(db: { clear(): void }, renderFn: (db: any, container: SVGSVGElement) => void) {
  return {
    draw(_text: string, id: string, _version: string, _diagramObject: unknown): void {
      let svgElement = document.getElementById(id) as unknown as SVGSVGElement | null;
      if (!svgElement) {
        svgElement = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
        svgElement.setAttribute('id', id);
        document.body.appendChild(svgElement);
      }
      renderFn(db, svgElement);
    },
  };
}

function createParser(db: { clear(): void }, parseFn: (text: string, db: any) => void) {
  return {
    parse(text: string): void {
      db.clear();
      parseFn(text, db);
    },
  };
}

const domainDb = new D5DomainDb();
const subdomainDb = new D5SubdomainDb();
const contextDb = new D5ContextDb();
const aggregateDb = new D5AggregateDb();

export const d5Diagrams = [
  {
    id: 'd5-domain',
    detector: (text: string, _config?: unknown): boolean => detectDomain(text),
    loader: async () => ({
      id: 'd5-domain' as const,
      diagram: {
        db: domainDb,
        renderer: createRenderer(domainDb, renderDomain),
        parser: createParser(domainDb, parseDomain),
      },
    }),
  },
  {
    id: 'd5-subdomain',
    detector: (text: string, _config?: unknown): boolean => detectSubdomain(text),
    loader: async () => ({
      id: 'd5-subdomain' as const,
      diagram: {
        db: subdomainDb,
        renderer: createRenderer(subdomainDb, renderSubdomain),
        parser: createParser(subdomainDb, parseSubdomain),
      },
    }),
  },
  {
    id: 'd5-context',
    detector: (text: string, _config?: unknown): boolean => detectContext(text),
    loader: async () => ({
      id: 'd5-context' as const,
      diagram: {
        db: contextDb,
        renderer: createRenderer(contextDb, renderContext),
        parser: createParser(contextDb, parseContext),
      },
    }),
  },
  {
    id: 'd5-aggregate',
    detector: (text: string, _config?: unknown): boolean => detectAggregate(text),
    loader: async () => ({
      id: 'd5-aggregate' as const,
      diagram: {
        db: aggregateDb,
        renderer: createRenderer(aggregateDb, renderAggregate),
        parser: createParser(aggregateDb, parseAggregate),
      },
    }),
  },
];
