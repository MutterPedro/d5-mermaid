// Shared "boundary" geometry for the two views that draw a subject container with
// neighbours outside it (`d5-context`: a BoundedContext with Actors / neighbouring contexts;
// `d5-aggregate`: an Aggregate with the aggregates it references by id).
//
// Dagre lays the whole graph out — subject members inside a compound cluster, neighbours
// outside it — but knows nothing about the space the container itself needs: a header, its
// padding, a sidebar or bands of text inside the boundary. Rather than fight the layout,
// this opens that space up afterwards, one axis at a time: everything from the inner span's
// start onwards is pushed by the leading inset, everything past its end by the trailing one
// as well. The mapping is monotonic, so the layout's topology (what is left of / above
// what, which edges cross the boundary) is preserved.

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Map a layout coordinate on one axis to its final position. `[lo, hi]` is the inner span;
 * `before` is the offset of anything ahead of it, `inside` the offset from `lo` onwards
 * (i.e. `before` + the leading inset), `extraAfter` the trailing inset added past `hi`.
 */
export function stretchAxis(
  lo: number,
  hi: number,
  before: number,
  inside: number,
  extraAfter: number,
): (v: number) => number {
  return (v) => (v >= lo ? inside : before) + v + (v > hi ? extraAfter : 0);
}

/** Grow `rect` (or start one) so it contains the `w`×`h` box centred on (`cx`, `cy`). */
export function growRect(rect: Rect | undefined, cx: number, cy: number, w = 0, h = 0): Rect {
  const box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
  if (!rect) return box;
  return {
    x0: Math.min(rect.x0, box.x0),
    y0: Math.min(rect.y0, box.y0),
    x1: Math.max(rect.x1, box.x1),
    y1: Math.max(rect.y1, box.y1),
  };
}

interface LaidOutGraph {
  nodes(): string[];
  node(id: string): { x: number; y: number; width: number; height: number };
  edges(): { v: string; w: string; name?: string }[];
  edge(e: { v: string; w: string; name?: string }): {
    points?: { x: number; y: number }[];
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

/**
 * Bounding rect of the `inner` nodes of a laid-out Dagre graph, together with every edge
 * (points and label) that runs between two of them. `undefined` when none are laid out.
 */
export function innerBounds(g: LaidOutGraph, inner: ReadonlySet<string>): Rect | undefined {
  let rect: Rect | undefined;
  for (const id of g.nodes()) {
    if (!inner.has(id)) continue;
    const n = g.node(id);
    if (n) rect = growRect(rect, n.x, n.y, n.width, n.height);
  }
  for (const e of g.edges()) {
    if (!inner.has(e.v) || !inner.has(e.w)) continue;
    const edge = g.edge(e);
    for (const p of edge.points ?? []) rect = growRect(rect, p.x, p.y);
    if (typeof edge.x === 'number' && typeof edge.y === 'number') {
      rect = growRect(rect, edge.x, edge.y, edge.width ?? 0, edge.height ?? 0);
    }
  }
  return rect;
}
