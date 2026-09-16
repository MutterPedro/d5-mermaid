import type { D5DomainReadable, SubdomainType } from './db.js';
import dagre from '@dagrejs/dagre';
import { createEdgeLabel, edgeLabelSize } from '../shared/edge-label.js';
import { boxWidth, finiteOr0 } from '../shared/shape.js';
import { type Direction, isAgainstFlow } from '../shared/direction.js';

const BACK_EDGE_TITLE =
  'Runs against the dominant flow — likely part of a dependency cycle among these subdomains.';

const REL_LABEL_MAX_WIDTH = 150;
// Perpendicular spread (in px, at the midpoint) between cross-domain edges that connect the
// same pair of Subdomains — e.g. a direct two-way relationship — so they bow apart instead
// of drawing on top of each other. Sized to keep two typical-length edge-label pills from
// touching (confirmed empirically: 30 was too tight for even short 2-3 word labels), not a
// guarantee against arbitrarily long ones.
const CROSS_EDGE_GAP = 64;

const SVG_NS = 'http://www.w3.org/2000/svg';

const SUBDOMAIN_MIN_WIDTH = 180;
const SUBDOMAIN_MAX_WIDTH = 320;
const SUBDOMAIN_HEIGHT = 70;
const SUBDOMAIN_LABEL_PAD_X = 18;
const DOMAIN_PADDING = 30;
const TITLE_HEIGHT = 40;
const DOMAIN_HEADER = 36;
const ARROW_MARKER_SIZE = 8;
// Vertical gap between stacked domain boxes when a diagram declares more than one
// top-level `Domain(...)` — wide enough for a cross-domain relationship label to sit in.
const DOMAIN_GAP = 48;
// Fallback canvas size for the degenerate case of a diagram with no `Domain` block at all (or
// every one hidden by the toggle). Only the space is reserved — no empty Domain box is drawn.
const EMPTY_DOMAIN_W = 400;
const EMPTY_DOMAIN_H = DOMAIN_PADDING * 2;

const SUBDOMAIN_COLORS: Record<SubdomainType, { fill: string; stroke: string }> = {
  core: { fill: '#dbeafe', stroke: '#3b82f6' },
  supporting: { fill: '#fef9c3', stroke: '#ca8a04' },
  generic: { fill: '#e5e7eb', stroke: '#6b7280' },
};

const LEGEND_ITEMS: { type: SubdomainType; label: string }[] = [
  { type: 'core', label: 'Core' },
  { type: 'supporting', label: 'Supporting' },
  { type: 'generic', label: 'Generic' },
];

interface Subdomain {
  id: string;
  label: string;
  type: SubdomainType;
  domainId: string;
}

interface Relationship {
  source: string;
  target: string;
  label: string;
}

interface DomainBox {
  domain: { id: string; label: string };
  x: number;
  y: number;
  w: number;
  h: number;
  graphStartX: number;
  graphStartY: number;
  g: DagreGraph;
}

function addArrowMarker(svg: SVGSVGElement): void {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.prepend(defs);
  }
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', 'd5-arrowhead');
  marker.setAttribute('markerWidth', String(ARROW_MARKER_SIZE));
  marker.setAttribute('markerHeight', String(ARROW_MARKER_SIZE));
  marker.setAttribute('refX', String(ARROW_MARKER_SIZE));
  marker.setAttribute('refY', String(ARROW_MARKER_SIZE / 2));
  marker.setAttribute('orient', 'auto');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', `M0,0 L${ARROW_MARKER_SIZE},${ARROW_MARKER_SIZE / 2} L0,${ARROW_MARKER_SIZE}`);
  path.setAttribute('fill', '#64748b');
  marker.appendChild(path);
  defs.appendChild(marker);
}

// Generate an SVG path segment curving smoothly through an array of points provided by Dagre
function generateCurvePath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    d += ` Q ${p1.x} ${p1.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// Lay out one domain's subdomains + its own internal relationships as an independent Dagre
// graph. Each `Domain` block gets its own graph (rather than one shared compound graph) so
// its header/padding sizing stays exactly the single-domain math already proven out, and so
// domains can never end up interleaved with each other on the same rank.
function layoutDomainGraph(subdomains: Subdomain[], rels: Relationship[], direction: Direction, horizontal: boolean) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: horizontal ? 46 : 74,
    ranksep: horizontal ? 92 : 58,
    edgesep: 28,
    acyclicer: 'greedy',
    ranker: 'network-simplex',
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  subdomains.forEach((sd) => {
    const w = boxWidth(
      [{ text: sd.label, font: { size: 13, weight: 600 } }],
      SUBDOMAIN_LABEL_PAD_X,
      SUBDOMAIN_MIN_WIDTH,
      SUBDOMAIN_MAX_WIDTH,
    );
    g.setNode(sd.id, { width: w, height: SUBDOMAIN_HEIGHT });
  });

  rels.forEach((rel) => {
    const edgeCfg: Record<string, unknown> = { minlen: 1 };
    if (rel.label) {
      const { w, h } = edgeLabelSize(rel.label, REL_LABEL_MAX_WIDTH);
      edgeCfg.width = w;
      edgeCfg.height = h;
      edgeCfg.labelpos = 'c';
    }
    g.setEdge(rel.source, rel.target, edgeCfg);
  });

  dagre.layout(g);

  return { g, graphW: finiteOr0(g.graph().width), graphH: finiteOr0(g.graph().height) };
}

// `new dagre.graphlib.Graph()`'s inferred type (via `@dagrejs/dagre`'s own bundled types)
// carries the node/edge label shapes actually used below (`.points`, `.width`, `.x`/`.y`,
// ...); naming it explicitly as `dagre.graphlib.Graph` elsewhere resolves inconsistently
// against the separate `@types/dagre` package instead, so it's derived from this function's
// own return type rather than referenced directly.
type DagreGraph = ReturnType<typeof layoutDomainGraph>['g'];

// Point on the border of a `w`×`h` rect centered at `(cx, cy)`, along the line toward
// `(towardX, towardY)` — used to make a cross-domain relationship line touch each domain's
// subdomain box instead of running into its middle.
function clipToRect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  towardX: number,
  towardY: number,
): { x: number; y: number } {
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx !== 0 ? w / 2 / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? h / 2 / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function drawRelPath(
  container: SVGSVGElement,
  points: { x: number; y: number }[],
  label: string,
  isBackEdge: boolean,
  extraClass: string,
): void {
  const classes = ['d5-rel', extraClass];
  if (isBackEdge) classes.push('d5-rel-back');

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', classes.filter(Boolean).join(' '));

  if (isBackEdge) {
    const titleEl = document.createElementNS(SVG_NS, 'title');
    titleEl.textContent = BACK_EDGE_TITLE;
    group.appendChild(titleEl);
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', generateCurvePath(points));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', isBackEdge ? '#94a3b8' : '#64748b');
  path.setAttribute('stroke-width', '1.5');
  if (isBackEdge) path.setAttribute('stroke-dasharray', '6 4');
  path.setAttribute('marker-end', 'url(#d5-arrowhead)');
  group.appendChild(path);

  if (label) {
    // A true middle element (an odd-length array, e.g. a 3-point bowed curve) is the curve's
    // own control point — anchor the label there so two bowed-apart edges get visibly
    // separated labels too, not just separated lines. Otherwise (a straight 2-point line)
    // there's no middle element to use: `points[len/2]` would be the *end* point, sitting
    // the label right on the target box, so average the two endpoints instead.
    const mid =
      points.length % 2 === 1
        ? points[Math.floor(points.length / 2)]
        : { x: (points[0].x + points[points.length - 1].x) / 2, y: (points[0].y + points[points.length - 1].y) / 2 };
    group.appendChild(createEdgeLabel({ x: mid.x, y: mid.y, text: label, maxWidth: REL_LABEL_MAX_WIDTH }));
  }

  container.appendChild(group);
}

// Draws one intra-domain relationship (both endpoints in the same `Domain` block), routed by
// that domain's own Dagre graph. Returns whether it was drawn as a back edge.
function drawIntraDomainRel(
  container: SVGSVGElement,
  g: DagreGraph,
  graphStartX: number,
  graphStartY: number,
  rel: Relationship,
  direction: Direction,
): boolean {
  const edge = g.edge(rel.source, rel.target);
  if (!edge || !edge.points || edge.points.length === 0) return false;

  const shiftedPoints = edge.points.map((p: { x: number; y: number }) => ({
    x: graphStartX + p.x,
    y: graphStartY + p.y,
  }));

  // An edge that runs against the rank flow is a feedback / reverse dependency — draw it
  // lighter and dashed so it reads as one. "Against the flow" depends on which axis and
  // polarity `direction` puts the flow on (see isAgainstFlow).
  const srcNode = g.node(rel.source);
  const tgtNode = g.node(rel.target);
  const isBackEdge = !!srcNode && !!tgtNode && isAgainstFlow(direction, srcNode, tgtNode);

  const label = rel.label;
  let labelPoint: { x: number; y: number } | undefined;
  if (label) {
    labelPoint =
      typeof edge.x === 'number' && typeof edge.y === 'number'
        ? { x: graphStartX + edge.x, y: graphStartY + edge.y }
        : undefined;
  }

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', isBackEdge ? 'd5-rel d5-rel-back' : 'd5-rel');

  if (isBackEdge) {
    const titleEl = document.createElementNS(SVG_NS, 'title');
    titleEl.textContent = BACK_EDGE_TITLE;
    group.appendChild(titleEl);
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', generateCurvePath(shiftedPoints));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', isBackEdge ? '#94a3b8' : '#64748b');
  path.setAttribute('stroke-width', '1.5');
  if (isBackEdge) path.setAttribute('stroke-dasharray', '6 4');
  path.setAttribute('marker-end', 'url(#d5-arrowhead)');
  group.appendChild(path);

  if (label) {
    const p = labelPoint ?? shiftedPoints[Math.floor(shiftedPoints.length / 2)];
    group.appendChild(createEdgeLabel({ x: p.x, y: p.y, text: label, maxWidth: REL_LABEL_MAX_WIDTH }));
  }

  container.appendChild(group);
  return isBackEdge;
}

export function render(db: D5DomainReadable, container: SVGSVGElement): void {
  addArrowMarker(container);

  const domains = db.getDomains();
  const subdomains = db.getSubdomains();
  const relationships = db.getRelationships();

  // Flow direction is author-controlled via `direction` (default TB), shared by every
  // domain's internal layout.
  const direction = db.getDirection();
  const horizontal = direction === 'LR' || direction === 'RL';

  const byDomain = new Map<string, Subdomain[]>();
  const domainOf = new Map<string, string>();
  subdomains.forEach((sd) => {
    domainOf.set(sd.id, sd.domainId);
    const list = byDomain.get(sd.domainId);
    if (list) list.push(sd);
    else byDomain.set(sd.domainId, [sd]);
  });

  // A Rel is "intra-domain" when both ends live in the same Domain block — it's routed by
  // that domain's own graph. Otherwise (or if an endpoint is unknown) it's cross-domain.
  const intraByDomain = new Map<string, Relationship[]>();
  const crossDomainRels: Relationship[] = [];
  relationships.forEach((rel) => {
    const sourceDomain = domainOf.get(rel.source);
    const targetDomain = domainOf.get(rel.target);
    if (!sourceDomain || !targetDomain) return; // reference to an unknown subdomain
    if (sourceDomain === targetDomain) {
      const list = intraByDomain.get(sourceDomain);
      if (list) list.push(rel);
      else intraByDomain.set(sourceDomain, [rel]);
    } else {
      crossDomainRels.push(rel);
    }
  });

  const domainX = DOMAIN_PADDING;
  const domainY0 = (db.getTitle() ? TITLE_HEIGHT : 0) + DOMAIN_PADDING;

  // Each Domain gets its own independent Dagre layout, then the boxes are stacked
  // vertically top-to-bottom in declaration order.
  const domainBoxes: DomainBox[] = [];
  let cursorY = domainY0;
  domains.forEach((domain) => {
    const sds = byDomain.get(domain.id) ?? [];
    const rels = intraByDomain.get(domain.id) ?? [];
    const { g, graphW, graphH } = layoutDomainGraph(sds, rels, direction, horizontal);
    const w = graphW + DOMAIN_PADDING * 2;
    const h = DOMAIN_HEADER + graphH + DOMAIN_PADDING * 2;
    domainBoxes.push({
      domain,
      x: domainX,
      y: cursorY,
      w,
      h,
      graphStartX: domainX + DOMAIN_PADDING,
      graphStartY: cursorY + DOMAIN_HEADER + DOMAIN_PADDING,
      g,
    });
    cursorY += h + DOMAIN_GAP;
  });
  const hasDomains = domainBoxes.length > 0;
  if (hasDomains) cursorY -= DOMAIN_GAP;

  const maxDomainW = hasDomains ? Math.max(...domainBoxes.map((b) => b.w)) : EMPTY_DOMAIN_W;
  const contentBottom = hasDomains ? cursorY : domainY0 + EMPTY_DOMAIN_H;

  // The legend's own (fixed, not diagram-size-dependent) width has to be known before
  // `totalW` below is fixed — otherwise a diagram whose domains have shrunk down to their
  // empty/fallback size (every Subdomain toggled off, for instance) sets a viewBox too
  // narrow for the legend, which then overflows past it. Confirmed live: exactly that, on a
  // two-Domain diagram with everything hidden. Determining whether the "Reverse dependency"
  // entry will be needed means checking every relationship for one now, up front — using
  // the same per-domain graphs and domain declaration order the actual draw loops below use,
  // just run earlier; `domainIndex` is hoisted here too since this needs it and so does the
  // cross-domain draw loop later.
  const domainIndex = new Map<string, number>();
  domains.forEach((d, i) => domainIndex.set(d.id, i));

  let hasBackEdge = false;
  domainBoxes.forEach((box) => {
    (intraByDomain.get(box.domain.id) ?? []).forEach((rel) => {
      const srcNode = box.g.node(rel.source);
      const tgtNode = box.g.node(rel.target);
      if (srcNode && tgtNode && isAgainstFlow(direction, srcNode, tgtNode)) hasBackEdge = true;
    });
  });
  crossDomainRels.forEach((rel) => {
    const sourceDomain = domainOf.get(rel.source);
    const targetDomain = domainOf.get(rel.target);
    if (sourceDomain && targetDomain && (domainIndex.get(targetDomain) ?? 0) < (domainIndex.get(sourceDomain) ?? 0)) {
      hasBackEdge = true;
    }
  });

  const legendW = domainX + LEGEND_ITEMS.length * 90 + (hasBackEdge ? 170 : 0);
  const totalW = Math.max(domainX + maxDomainW + DOMAIN_PADDING, legendW);
  const legendH = 30;
  const totalH = contentBottom + legendH + DOMAIN_PADDING;

  container.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  container.setAttribute('height', String(totalH));
  container.style.maxWidth = `${totalW}px`;

  // Title
  const title = db.getTitle();
  if (title) {
    const titleEl = document.createElementNS(SVG_NS, 'text');
    titleEl.setAttribute('class', 'd5-title');
    titleEl.setAttribute('x', String(totalW / 2));
    titleEl.setAttribute('y', '24');
    titleEl.setAttribute('text-anchor', 'middle');
    titleEl.setAttribute('font-size', '18');
    titleEl.setAttribute('font-weight', 'bold');
    titleEl.setAttribute('fill', '#1e293b');
    titleEl.textContent = title;
    container.appendChild(titleEl);
  }

  // Domain boundaries + subdomains, and a global lookup of each subdomain's center (used to
  // route cross-domain relationships once every box has been placed).
  const subdomainGlobal = new Map<string, { cx: number; cy: number; w: number; h: number }>();

  domainBoxes.forEach((box) => {
    const domainGroup = document.createElementNS(SVG_NS, 'g');
    domainGroup.setAttribute('class', 'd5-domain');

    const domainRect = document.createElementNS(SVG_NS, 'rect');
    domainRect.setAttribute('x', String(box.x));
    domainRect.setAttribute('y', String(box.y));
    domainRect.setAttribute('width', String(box.w));
    domainRect.setAttribute('height', String(box.h));
    domainRect.setAttribute('rx', '12');
    domainRect.setAttribute('fill', '#f8fafc');
    domainRect.setAttribute('stroke', '#94a3b8');
    domainRect.setAttribute('stroke-width', '2');
    domainRect.setAttribute('stroke-dasharray', '8 4');
    domainGroup.appendChild(domainRect);

    const domainLabel = document.createElementNS(SVG_NS, 'text');
    domainLabel.setAttribute('x', String(box.x + 16));
    domainLabel.setAttribute('y', String(box.y + 24));
    domainLabel.setAttribute('font-size', '14');
    domainLabel.setAttribute('font-weight', '600');
    domainLabel.setAttribute('fill', '#475569');
    domainLabel.textContent = box.domain.label;
    domainGroup.appendChild(domainLabel);

    container.appendChild(domainGroup);

    (byDomain.get(box.domain.id) ?? []).forEach((sd) => {
      const node = box.g.node(sd.id);
      if (!node) return;

      const w = node.width;
      const h = node.height;
      const x = box.graphStartX + node.x - w / 2;
      const y = box.graphStartY + node.y - h / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;
      subdomainGlobal.set(sd.id, { cx, cy, w, h });

      const colors = SUBDOMAIN_COLORS[sd.type];

      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('class', `d5-subdomain d5-subdomain-${sd.type}`);

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', colors.fill);
      rect.setAttribute('stroke', colors.stroke);
      rect.setAttribute('stroke-width', '2');
      group.appendChild(rect);

      const labelText = document.createElementNS(SVG_NS, 'text');
      labelText.setAttribute('x', String(cx));
      labelText.setAttribute('y', String(cy - 4));
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('font-size', '13');
      labelText.setAttribute('font-weight', '600');
      labelText.setAttribute('fill', '#1e293b');
      labelText.textContent = sd.label;
      group.appendChild(labelText);

      const typeText = document.createElementNS(SVG_NS, 'text');
      typeText.setAttribute('x', String(cx));
      typeText.setAttribute('y', String(cy + 16));
      typeText.setAttribute('text-anchor', 'middle');
      typeText.setAttribute('font-size', '11');
      typeText.setAttribute('fill', colors.stroke);
      typeText.textContent = sd.type;
      group.appendChild(typeText);

      container.appendChild(group);
    });
  });

  // Relationships as arrows. `hasBackEdge` and `domainIndex` were already computed above
  // (needed there to size the legend before the viewBox was fixed) — reused here as-is.
  domainBoxes.forEach((box) => {
    (intraByDomain.get(box.domain.id) ?? []).forEach((rel) => {
      drawIntraDomainRel(container, box.g, box.graphStartX, box.graphStartY, rel, direction);
    });
  });

  // Cross-domain relationships route as a straight line clipped to each subdomain's box,
  // drawn once every domain's subdomains have a known global position. A cross-domain edge
  // that points at an earlier domain in the (declaration-order, top-to-bottom) stack reads
  // the same way an intra-domain back edge does — a reverse / cyclical dependency.

  // Cross-domain Rels between the same *pair* of Subdomains — regardless of which way each
  // one points — are grouped so a direct two-way relationship (A->B and B->A, a fairly
  // natural thing between two Subdomains in different Domains) doesn't draw as one line
  // fully overlapping itself: confirmed as a real readability problem by hand-testing. A
  // group of one (the common case) still draws the plain straight line.
  const crossGroups = new Map<string, Relationship[]>();
  crossDomainRels.forEach((rel) => {
    const key = [rel.source, rel.target].sort().join('|');
    const list = crossGroups.get(key);
    if (list) list.push(rel);
    else crossGroups.set(key, [rel]);
  });

  crossGroups.forEach((group) => {
    // A canonical direction (sorted ids, not each Rel's own source/target) to spread
    // multiple edges apart by — so the spread is the same regardless of which direction any
    // individual edge in the group happens to point.
    const [idA, idB] = [group[0].source, group[0].target].sort() as [string, string];
    const a = subdomainGlobal.get(idA);
    const b = subdomainGlobal.get(idB);
    if (!a || !b) return;
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    group.forEach((rel, i) => {
      const src = subdomainGlobal.get(rel.source);
      const tgt = subdomainGlobal.get(rel.target);
      if (!src || !tgt) return;

      const sourceDomain = domainOf.get(rel.source)!;
      const targetDomain = domainOf.get(rel.target)!;
      const isBackEdge = (domainIndex.get(targetDomain) ?? 0) < (domainIndex.get(sourceDomain) ?? 0);
      if (isBackEdge) hasBackEdge = true;

      const start = clipToRect(src.cx, src.cy, src.w, src.h, tgt.cx, tgt.cy);
      const end = clipToRect(tgt.cx, tgt.cy, tgt.w, tgt.h, src.cx, src.cy);

      if (group.length === 1) {
        drawRelPath(container, [start, end], rel.label, isBackEdge, 'd5-rel-cross');
      } else {
        const offset = (i - (group.length - 1) / 2) * CROSS_EDGE_GAP;
        const mid = { x: (start.x + end.x) / 2 + nx * offset, y: (start.y + end.y) / 2 + ny * offset };
        drawRelPath(container, [start, mid, end], rel.label, isBackEdge, 'd5-rel-cross');
      }
    });
  });

  // Legend
  const legendY = contentBottom + 16;
  const legendGroup = document.createElementNS(SVG_NS, 'g');
  legendGroup.setAttribute('class', 'd5-legend');

  let legendX = domainX;
  LEGEND_ITEMS.forEach((item) => {
    const colors = SUBDOMAIN_COLORS[item.type];

    const swatch = document.createElementNS(SVG_NS, 'rect');
    swatch.setAttribute('x', String(legendX));
    swatch.setAttribute('y', String(legendY));
    swatch.setAttribute('width', '14');
    swatch.setAttribute('height', '14');
    swatch.setAttribute('rx', '3');
    swatch.setAttribute('fill', colors.fill);
    swatch.setAttribute('stroke', colors.stroke);
    swatch.setAttribute('stroke-width', '1.5');
    legendGroup.appendChild(swatch);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(legendX + 20));
    label.setAttribute('y', String(legendY + 11));
    label.setAttribute('font-size', '11');
    label.setAttribute('fill', '#64748b');
    label.textContent = item.label;
    legendGroup.appendChild(label);

    legendX += 90;
  });

  if (hasBackEdge) {
    const swatchY = legendY + 7;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(legendX));
    line.setAttribute('y1', String(swatchY));
    line.setAttribute('x2', String(legendX + 14));
    line.setAttribute('y2', String(swatchY));
    line.setAttribute('stroke', '#94a3b8');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '6 4');
    legendGroup.appendChild(line);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(legendX + 20));
    label.setAttribute('y', String(legendY + 11));
    label.setAttribute('font-size', '11');
    label.setAttribute('fill', '#64748b');
    label.textContent = 'Reverse dependency (cycle)';
    legendGroup.appendChild(label);

    legendX += 170;
  }

  container.appendChild(legendGroup);
}
