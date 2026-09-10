// Shared relationship / edge label rendering.
//
// Every D5 renderer draws a labelled pill at the midpoint of a relationship edge. They
// used to do it inline with hard-coded pill widths (90 / 100 / 110 px), so any label
// longer than a few characters spilled out of the pill on both sides. This builds a pill
// that is sized to its (optionally wrapped) text.

import { measureText, wrapText, lineHeight, type FontSpec } from './text.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const PAD_X = 7;
const PAD_Y = 3;
const DEFAULT_MAX_WIDTH = 150;
const DEFAULT_FONT_SIZE = 10;

export interface EdgeLabelOptions {
  /** label centre */
  x: number;
  y: number;
  text: string;
  /** wrap threshold in px (default 150) */
  maxWidth?: number;
  fontSize?: number;
  /** text colour (default slate-600) */
  fill?: string;
  className?: string;
}

export interface Size {
  w: number;
  h: number;
}

function layout(text: string, maxWidth: number, fontSize: number): { lines: string[]; size: Size } {
  const font: FontSpec = { size: fontSize, weight: 600 };
  const lines = wrapText(text, maxWidth, font);
  const textW = lines.reduce((m, l) => Math.max(m, measureText(l, font)), 1);
  const lh = lineHeight(fontSize);
  return {
    lines,
    size: { w: Math.ceil(textW + PAD_X * 2), h: Math.ceil(lines.length * lh + PAD_Y * 2) },
  };
}

/** Bounding size of the pill that `createEdgeLabel` would produce for `text`. */
export function edgeLabelSize(
  text: string,
  maxWidth = DEFAULT_MAX_WIDTH,
  fontSize = DEFAULT_FONT_SIZE,
): Size {
  return layout(text, maxWidth, fontSize).size;
}

/** A `<g>` containing a white pill sized to the text, plus the (wrapped) label lines. */
export function createEdgeLabel(opts: EdgeLabelOptions): SVGGElement {
  const fontSize = opts.fontSize ?? DEFAULT_FONT_SIZE;
  const maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;
  const { lines, size } = layout(opts.text, maxWidth, fontSize);
  const lh = lineHeight(fontSize);

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', opts.className ?? 'd5-edge-label');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(opts.x - size.w / 2));
  rect.setAttribute('y', String(opts.y - size.h / 2));
  rect.setAttribute('width', String(size.w));
  rect.setAttribute('height', String(size.h));
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', 'white');
  rect.setAttribute('fill-opacity', '0.92');
  rect.setAttribute('stroke', '#cbd5e1');
  rect.setAttribute('stroke-width', '1');
  g.appendChild(rect);

  const firstBaseline = opts.y - size.h / 2 + PAD_Y + fontSize * 0.82;
  lines.forEach((ln, i) => {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', String(opts.x));
    t.setAttribute('y', String(firstBaseline + i * lh));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', String(fontSize));
    t.setAttribute('font-weight', '600');
    t.setAttribute('fill', opts.fill ?? '#475569');
    t.textContent = ln;
    g.appendChild(t);
  });

  return g;
}
