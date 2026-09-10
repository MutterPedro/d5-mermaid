// Regression guard for the real-world example models in `examples/`.
//
// For every `examples/**/*.md` it: extracts the fenced D5 block, renders it through the
// real parse → render path, and asserts
//   1. no centred `<text>` overflows its owning shape (uses the same headless
//      `measureText` the renderers size with, so it is self-consistent),
//   2. the viewBox is present and within a sane range,
//   3. the serialised SVG matches a snapshot.
// A layout regression on any hardened example model therefore fails CI.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { measureText, type FontSpec } from '../src/shared/text.js';

import { D5DomainDb } from '../src/d5-domain/db.js';
import { parse as parseDomain } from '../src/d5-domain/parser.js';
import { render as renderDomain } from '../src/d5-domain/renderer.js';

import { D5SubdomainDb } from '../src/d5-subdomain/db.js';
import { parse as parseSubdomain } from '../src/d5-subdomain/parser.js';
import { render as renderSubdomain } from '../src/d5-subdomain/renderer.js';

import { D5ContextDb } from '../src/d5-context/db.js';
import { parse as parseContext } from '../src/d5-context/parser.js';
import { render as renderContext } from '../src/d5-context/renderer.js';

import { D5AggregateDb } from '../src/d5-aggregate/db.js';
import { parse as parseAggregate } from '../src/d5-aggregate/parser.js';
import { render as renderAggregate } from '../src/d5-aggregate/renderer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// vitest runs from the package root (`d5-mermaid/`).
const EXAMPLES_ROOT = join(process.cwd(), 'examples');

// Groups whose text is intentionally not centred inside a single sibling shape.
// `d5-rel` also covers `d5-rel-badge` / `d5-rel-role` / `d5-rel-acl` (substring match) —
// context-map decoration is sized by construction and covered by its own unit test +
// snapshot; the free-text fallback pill is still checked via its `d5-edge-label` group.
const SKIP_GROUP_CLASSES = [
  'd5-legend',
  'd5-invariants',
  'd5-language-note',
  'd5-title',
  'd5-domain',
  'd5-rel',
];

function extractBlock(md: string): string {
  const m = md.match(/```[^\n]*\n([\s\S]*?)```/);
  return (m ? m[1] : md).replace(/\s+$/, '');
}

function renderModel(src: string): SVGSVGElement {
  const container = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  document.body.appendChild(container);
  const kind = src.trim().split('\n')[0].trim();

  if (kind === 'd5-domain') {
    const db = new D5DomainDb();
    parseDomain(src, db);
    renderDomain(db, container);
  } else if (kind === 'd5-subdomain') {
    const db = new D5SubdomainDb();
    parseSubdomain(src, db);
    renderSubdomain(db, container);
  } else if (kind === 'd5-context') {
    const db = new D5ContextDb();
    parseContext(src, db);
    renderContext(db, container);
  } else if (kind === 'd5-aggregate') {
    const db = new D5AggregateDb();
    parseAggregate(src, db);
    renderAggregate(db, container);
  } else {
    throw new Error(`unknown diagram type: ${kind}`);
  }
  return container;
}

function fontOf(t: Element): FontSpec {
  const size = parseFloat(t.getAttribute('font-size') || '13');
  const w = t.getAttribute('font-weight');
  const weight: FontSpec['weight'] =
    w === 'bold' || w === '700' ? 'bold' : w === '600' ? 600 : 'normal';
  return { size, weight };
}

function overflowViolations(svg: SVGSVGElement): string[] {
  const out: string[] = [];
  svg.querySelectorAll('g').forEach((g) => {
    const cls = g.getAttribute('class') || '';
    if (SKIP_GROUP_CLASSES.some((s) => cls.includes(s))) return;

    const shape = g.querySelector('rect, ellipse');
    if (!shape) return;

    let left: number;
    let right: number;
    if (shape.tagName.toLowerCase() === 'rect') {
      left = parseFloat(shape.getAttribute('x') || '0');
      right = left + parseFloat(shape.getAttribute('width') || '0');
    } else {
      const cx = parseFloat(shape.getAttribute('cx') || '0');
      const rx = parseFloat(shape.getAttribute('rx') || '0');
      left = cx - rx;
      right = cx + rx;
    }

    g.querySelectorAll('text').forEach((t) => {
      if (t.getAttribute('text-anchor') !== 'middle') return;
      const x = parseFloat(t.getAttribute('x') || '0');
      const w = measureText(t.textContent || '', fontOf(t));
      const tol = 2;
      if (x - w / 2 < left - tol || x + w / 2 > right + tol) {
        out.push(
          `<${cls || shape.tagName}> "${t.textContent}" ~${Math.round(w)}px @ x=${Math.round(
            x,
          )} escapes [${Math.round(left)}, ${Math.round(right)}]`,
        );
      }
    });
  });
  return out;
}

function readViewBox(svg: SVGSVGElement): { w: number; h: number } {
  const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  return { w: vb[2] || 0, h: vb[3] || 0 };
}

// every `examples/<group>/*.md`
const files = readdirSync(EXAMPLES_ROOT)
  .filter((d) => {
    try {
      return statSync(join(EXAMPLES_ROOT, d)).isDirectory();
    } catch {
      return false;
    }
  })
  .flatMap((group) =>
    readdirSync(join(EXAMPLES_ROOT, group))
      .filter((f) => f.endsWith('.md'))
      .map((f) => join(EXAMPLES_ROOT, group, f)),
  )
  .sort();

describe('examples render regression', () => {
  it('has example model files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    describe(relative(EXAMPLES_ROOT, file), () => {
      const src = extractBlock(readFileSync(file, 'utf8'));
      const svg = renderModel(src);

      it('no centred text overflows its shape', () => {
        expect(overflowViolations(svg)).toEqual([]);
      });

      it('viewBox is present and within a sane range', () => {
        const { w, h } = readViewBox(svg);
        expect(w).toBeGreaterThan(80);
        expect(h).toBeGreaterThan(80);
        expect(w).toBeLessThan(6000);
        expect(h).toBeLessThan(6000);
      });

      it('matches SVG snapshot', () => {
        expect(svg.innerHTML).toMatchSnapshot();
      });
    });
  }
});
