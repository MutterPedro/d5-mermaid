// Shared shape auto-sizing helpers. Every D5 renderer used hard-coded node widths, so
// any label longer than the constant overflowed. These size a shape to its measured text.

import { measureText, type FontSpec } from './text.js';

export interface TextEntry {
  text: string;
  font: FontSpec;
}

/**
 * Width of a rectangular box that must contain every entry on one line, plus `padX` on
 * each side, clamped to `[min, max]`.
 */
export function boxWidth(entries: TextEntry[], padX: number, min: number, max = Infinity): number {
  const widest = entries.reduce((m, e) => Math.max(m, measureText(e.text, e.font)), 0);
  return Math.round(Math.max(min, Math.min(max, widest + padX * 2)));
}

/**
 * Horizontal radius for an ellipse that comfortably contains a single line of text of
 * width `textWidth` centred in it, never below `min`.
 */
export function ellipseRx(textWidth: number, min: number, marginX = 14): number {
  // A centred line only gets the full 2·rx at the exact middle; leave headroom.
  return Math.round(Math.max(min, textWidth / 1.6 + marginX));
}

/**
 * `dagre.layout()` on a graph with zero nodes reports `graph().width`/`.height` as
 * `-Infinity`, not `0` or `undefined` — so the common `g.graph().width || 0` fallback
 * doesn't catch it (`-Infinity` is truthy). An empty layout is a real case here: every
 * `attach<Type>Toggle` lets an author hide every item in a container (a Domain with all its
 * Subdomains unchecked, etc.), and the `-Infinity` silently poisoned that container's box
 * size — then, for anything stacking multiple such boxes, every box after it too. Confirmed
 * live: hiding every Subdomain of one Domain broke the whole d5-domain diagram, not just
 * that Domain's box.
 */
export function finiteOr0(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/**
 * Lay `count` equal cells out in a grid whose overall width stays within `targetWidth`
 * where possible. Returns the column count and the resulting row count.
 */
export function gridDimensions(
  count: number,
  cellWidth: number,
  gap: number,
  targetWidth: number,
): { cols: number; rows: number } {
  if (count <= 0) return { cols: 0, rows: 0 };
  const fit = Math.max(1, Math.floor((targetWidth + gap) / (cellWidth + gap)));
  const cols = Math.min(count, fit);
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}
