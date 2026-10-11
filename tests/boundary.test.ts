import { describe, it, expect } from 'vitest';
import { stretchAxis, growRect, innerBounds } from '../src/shared/boundary.js';

describe('stretchAxis', () => {
  // inner span [100, 200]; 10 ahead of it, 40 from its start on, 25 more past its end
  const f = stretchAxis(100, 200, 10, 40, 25);

  it('offsets what is ahead of the inner span by `before` only', () => {
    expect(f(0)).toBe(10);
    expect(f(99)).toBe(109);
  });

  it('offsets the inner span, both ends included, by `inside`', () => {
    expect(f(100)).toBe(140);
    expect(f(150)).toBe(190);
    expect(f(200)).toBe(240);
  });

  it('adds the trailing inset past the inner span', () => {
    expect(f(201)).toBe(266);
  });

  it('never reorders two coordinates', () => {
    const xs = [0, 50, 99.9, 100, 100.1, 199, 200, 200.1, 400];
    const mapped = xs.map(f);
    expect([...mapped].sort((a, b) => a - b)).toEqual(mapped);
  });
});

describe('growRect', () => {
  it('starts a rect from a centred box', () => {
    expect(growRect(undefined, 50, 20, 40, 10)).toEqual({ x0: 30, y0: 15, x1: 70, y1: 25 });
  });

  it('grows to contain another box, and a bare point', () => {
    const rect = growRect(growRect(undefined, 50, 20, 40, 10), 100, 100, 20, 20);
    expect(rect).toEqual({ x0: 30, y0: 15, x1: 110, y1: 110 });
    expect(growRect(rect, 0, 0)).toEqual({ x0: 0, y0: 0, x1: 110, y1: 110 });
  });
});

describe('innerBounds', () => {
  const nodes: Record<string, { x: number; y: number; width: number; height: number }> = {
    a: { x: 50, y: 50, width: 40, height: 20 },
    b: { x: 150, y: 50, width: 40, height: 20 },
    out: { x: 500, y: 500, width: 40, height: 20 },
  };
  const edges = [
    { v: 'a', w: 'b', points: [{ x: 100, y: 10 }], x: 100, y: 90, width: 20, height: 10 },
    { v: 'b', w: 'out', points: [{ x: 300, y: 300 }] },
  ];
  const graph = {
    nodes: () => Object.keys(nodes),
    node: (id: string) => nodes[id],
    edges: () => edges.map(({ v, w }) => ({ v, w })),
    edge: (e: { v: string; w: string }) => edges.find((x) => x.v === e.v && x.w === e.w)!,
  };

  it('covers the inner nodes plus the points and labels of edges between them — not ones that leave', () => {
    expect(innerBounds(graph, new Set(['a', 'b']))).toEqual({ x0: 30, y0: 10, x1: 170, y1: 95 });
  });

  it('is undefined when nothing inner is laid out', () => {
    expect(innerBounds(graph, new Set())).toBeUndefined();
  });
});
