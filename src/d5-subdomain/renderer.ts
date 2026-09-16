import type { D5SubdomainReadable } from './db.js';
import type { SubdomainType } from './db.js';
import dagre from '@dagrejs/dagre';
import { createEdgeLabel, edgeLabelSize } from '../shared/edge-label.js';
import { measureText, wrapText, lineHeight } from '../shared/text.js';
import { classifyRelationship, type RelPattern } from '../shared/context-relationship.js';
import { finiteOr0 } from '../shared/shape.js';

const REL_LABEL_MAX_WIDTH = 150;
const REL_STROKE = '#64748b';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Pt {
  x: number;
  y: number;
}

function pointAlong(from: Pt, to: Pt, dist: number): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / len) * dist, y: from.y + (dy / len) * dist };
}

function angleDeg(from: Pt, to: Pt): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/** small circle with a role letter (U / D / S / C) sat on an edge endpoint */
function roleMarker(cx: number, cy: number, text: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-rel-role');
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', String(cx));
  c.setAttribute('cy', String(cy));
  c.setAttribute('r', '8');
  c.setAttribute('fill', 'white');
  c.setAttribute('stroke', REL_STROKE);
  c.setAttribute('stroke-width', '1.25');
  g.appendChild(c);
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(cx));
  t.setAttribute('y', String(cy + 3));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', '9');
  t.setAttribute('font-weight', 'bold');
  t.setAttribute('fill', '#475569');
  t.textContent = text;
  g.appendChild(t);
  return g;
}

/** compact pattern badge (ACL / OHS / PL / CF / C/S / SK / P) centred on an edge */
function patternBadge(cx: number, cy: number, text: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-rel-badge');
  const w = Math.ceil(measureText(text, { size: 10, weight: 700 }) + 12);
  const h = 18;
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(cx - w / 2));
  rect.setAttribute('y', String(cy - h / 2));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', '#eef2ff');
  rect.setAttribute('stroke', '#c7d2fe');
  rect.setAttribute('stroke-width', '1');
  g.appendChild(rect);
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(cx));
  t.setAttribute('y', String(cy + 3.5));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', '10');
  t.setAttribute('font-weight', '700');
  t.setAttribute('fill', '#4338ca');
  t.textContent = text;
  g.appendChild(t);
  return g;
}

/** anti-corruption-layer gate: a small box straddling the edge near the downstream end */
function aclGate(cx: number, cy: number, deg: number): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-rel-acl');
  g.setAttribute('transform', `translate(${cx} ${cy}) rotate(${deg})`);
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', '-9');
  rect.setAttribute('y', '-7');
  rect.setAttribute('width', '18');
  rect.setAttribute('height', '14');
  rect.setAttribute('rx', '2');
  rect.setAttribute('fill', 'white');
  rect.setAttribute('stroke', REL_STROKE);
  rect.setAttribute('stroke-width', '1.5');
  g.appendChild(rect);
  for (const dx of [-3, 3]) {
    const tick = document.createElementNS(SVG_NS, 'line');
    tick.setAttribute('x1', String(dx));
    tick.setAttribute('y1', '-7');
    tick.setAttribute('x2', String(dx));
    tick.setAttribute('y2', '7');
    tick.setAttribute('stroke', REL_STROKE);
    tick.setAttribute('stroke-width', '1');
    g.appendChild(tick);
  }
  return g;
}

/** open-host-service socket: a hollow ring near the upstream end */
function ohsSocket(cx: number, cy: number): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-rel-ohs');
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', String(cx));
  c.setAttribute('cy', String(cy));
  c.setAttribute('r', '5');
  c.setAttribute('fill', 'white');
  c.setAttribute('stroke', REL_STROKE);
  c.setAttribute('stroke-width', '1.5');
  g.appendChild(c);
  return g;
}

const BC_RX = 80;
const BC_RY = 28;
const BC_LABEL_WRAP_W = 150;
const TITLE_HEIGHT = 40;
const MARGIN = 30;
const ARROW_MARKER_SIZE = 8;
const BC_LABEL_FONT = 12;
const BC_TEAM_FONT = 10;
const LEGEND_H = 30;
const SUBDOMAIN_LABEL_H = 24;
const SUBDOMAIN_LABEL_FONT = 13;
const CLUSTER_PADDING_X = 20;

interface BcBox {
  rx: number;
  ry: number;
  labelLines: string[];
}
const CLUSTER_PADDING_Y_TOP = SUBDOMAIN_LABEL_H + 12;
const CLUSTER_PADDING_Y_BOTTOM = 16;
const NODESEP = 46;
const RANKSEP = 96;

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
  path.setAttribute(
    'd',
    `M0,0 L${ARROW_MARKER_SIZE},${ARROW_MARKER_SIZE / 2} L0,${ARROW_MARKER_SIZE}`,
  );
  path.setAttribute('fill', '#64748b');
  marker.appendChild(path);
  defs.appendChild(marker);
}

// Generate an SVG path segment curving smoothly through points from Dagre
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

export function render(db: D5SubdomainReadable, container: SVGSVGElement): void {
  addArrowMarker(container);

  const title = db.getTitle();
  const subdomains = db.getSubdomains();
  const boundedContexts = db.getBoundedContexts();
  const relationships = db.getRelationships();

  // Build compound Dagre graph: subdomains as clusters, BCs as child nodes.
  // Flow direction is author-controlled via `direction` (default LR — the context-map
  // convention: upstream on the left, downstream on the right).
  const direction = db.getDirection();
  const horizontal = direction === 'LR' || direction === 'RL';
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: direction,
    nodesep: NODESEP,
    ranksep: horizontal ? RANKSEP : 64,
    edgesep: 30,
    acyclicer: 'greedy',
    ranker: 'network-simplex',
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const subdomainIds = new Set(subdomains.map((s) => s.id));

  // Measure every bounded context so its ellipse fits the (wrapped) label + team.
  const bcBoxes = new Map<string, BcBox>();
  boundedContexts.forEach((bc) => {
    const labelLines = wrapText(bc.label, BC_LABEL_WRAP_W, {
      size: BC_LABEL_FONT,
      weight: 600,
    });
    const widest = labelLines.reduce(
      (m, l) => Math.max(m, measureText(l, { size: BC_LABEL_FONT, weight: 600 })),
      0,
    );
    const teamW = bc.team ? measureText(bc.team, { size: BC_TEAM_FONT }) : 0;
    const contentW = Math.max(widest, teamW);
    const contentH =
      labelLines.length * lineHeight(BC_LABEL_FONT) + (bc.team ? lineHeight(BC_TEAM_FONT) : 0);
    const rx = Math.round(Math.max(BC_RX, contentW / 1.55 + 16));
    const ry = Math.round(Math.max(BC_RY, contentH / 1.5 + 12));
    bcBoxes.set(bc.id, { rx, ry, labelLines });
  });

  subdomains.forEach((sd) => {
    const labelW = measureText(sd.label, {
      size: SUBDOMAIN_LABEL_FONT,
      weight: 600,
    });
    // Widen the cluster so a long subdomain title cannot overflow it.
    const padX = Math.max(CLUSTER_PADDING_X, Math.ceil((labelW + 28 - 2 * BC_RX) / 2));
    g.setNode(sd.id, {
      label: sd.label,
      clusterLabelPos: 'top',
      paddingTop: CLUSTER_PADDING_Y_TOP,
      paddingBottom: CLUSTER_PADDING_Y_BOTTOM,
      paddingLeft: padX,
      paddingRight: padX,
    });
  });

  boundedContexts.forEach((bc) => {
    const box = bcBoxes.get(bc.id)!;
    g.setNode(bc.id, { width: box.rx * 2, height: box.ry * 2 });
    if (bc.subdomainId && subdomainIds.has(bc.subdomainId)) {
      g.setParent(bc.id, bc.subdomainId);
    }
  });

  relationships.forEach((rel) => {
    const edgeCfg: Record<string, unknown> = { minlen: 1 };
    if (rel.label) {
      const pattern = classifyRelationship(rel.label);
      const { w, h } = pattern
        ? { w: pattern.badge ? Math.ceil(measureText(pattern.badge, { size: 10, weight: 700 }) + 16) : 8, h: 20 }
        : edgeLabelSize(rel.label, REL_LABEL_MAX_WIDTH);
      edgeCfg.width = w;
      edgeCfg.height = h;
      edgeCfg.labelpos = 'c';
    }
    g.setEdge(rel.source, rel.target, edgeCfg);
  });

  dagre.layout(g);

  const graphW = finiteOr0(g.graph().width);
  const graphH = finiteOr0(g.graph().height);

  // Distinct context-map patterns actually used, in first-seen order (for the legend).
  const usedPatterns: RelPattern[] = [];
  for (const rel of relationships) {
    const p = rel.label ? classifyRelationship(rel.label) : null;
    if (p && !usedPatterns.some((u) => u.name === p.name)) usedPatterns.push(p);
  }

  const gridStartX = MARGIN;
  const gridStartY = MARGIN + (title ? TITLE_HEIGHT : 0);

  const totalW = gridStartX + graphW + MARGIN;
  const totalH =
    gridStartY + graphH + LEGEND_H * (usedPatterns.length > 0 ? 2 : 1) + MARGIN;

  container.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  container.setAttribute('height', String(totalH));
  container.style.maxWidth = `${totalW}px`;

  // Title
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

  // Subdomain clusters
  subdomains.forEach((sd) => {
    const node = g.node(sd.id);
    if (!node) return;

    const colors = SUBDOMAIN_COLORS[sd.type];
    // A compound cluster with every child hidden (all its Bounded Contexts toggled off)
    // gets `x`/`y` from Dagre but no `width`/`height` at all — confirmed empirically against
    // @dagrejs/dagre, not assumed. `w / 2` against `undefined` then poisons `x` with NaN,
    // which browsers draw as a stray rect pinned at the SVG's origin. Fall back to a box
    // sized like a single (typically-sized) Bounded Context, so the Subdomain still reads.
    const labelW = measureText(sd.label, { size: SUBDOMAIN_LABEL_FONT, weight: 600 });
    const fallbackW = Math.max(2 * BC_RX, labelW) + 2 * CLUSTER_PADDING_X;
    const fallbackH = CLUSTER_PADDING_Y_TOP + CLUSTER_PADDING_Y_BOTTOM + 2 * BC_RY;
    const w = Number.isFinite(node.width) ? node.width : fallbackW;
    const h = Number.isFinite(node.height) ? node.height : fallbackH;
    const x = gridStartX + node.x - w / 2;
    const y = gridStartY + node.y - h / 2;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', `d5-subdomain d5-subdomain-${sd.type}`);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '12');
    rect.setAttribute('fill', colors.fill);
    rect.setAttribute('stroke', colors.stroke);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('stroke-dasharray', '8 4');
    group.appendChild(rect);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(x + w / 2));
    labelText.setAttribute('y', String(y + 20));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '13');
    labelText.setAttribute('font-weight', '600');
    labelText.setAttribute('fill', '#1e293b');
    labelText.textContent = sd.label;
    group.appendChild(labelText);

    container.appendChild(group);
  });

  // Bounded contexts
  boundedContexts.forEach((bc) => {
    const node = g.node(bc.id);
    if (!node) return;

    const sd = subdomains.find((s) => s.id === bc.subdomainId);
    const colors = sd ? SUBDOMAIN_COLORS[sd.type] : { fill: '#ffffff', stroke: '#64748b' };

    const cx = gridStartX + node.x;
    const cy = gridStartY + node.y;
    const box = bcBoxes.get(bc.id)!;

    const bcGroup = document.createElementNS(SVG_NS, 'g');
    bcGroup.setAttribute('class', 'd5-bounded-context');

    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    ellipse.setAttribute('cx', String(cx));
    ellipse.setAttribute('cy', String(cy));
    ellipse.setAttribute('rx', String(box.rx));
    ellipse.setAttribute('ry', String(box.ry));
    ellipse.setAttribute('fill', 'white');
    ellipse.setAttribute('stroke', colors.stroke);
    ellipse.setAttribute('stroke-width', '2');
    bcGroup.appendChild(ellipse);

    const labelLH = lineHeight(BC_LABEL_FONT);
    const teamLH = bc.team ? lineHeight(BC_TEAM_FONT) : 0;
    const blockH = box.labelLines.length * labelLH + teamLH;
    let ty = cy - blockH / 2 + BC_LABEL_FONT * 0.85;

    box.labelLines.forEach((ln) => {
      const bcLabel = document.createElementNS(SVG_NS, 'text');
      bcLabel.setAttribute('x', String(cx));
      bcLabel.setAttribute('y', String(ty));
      bcLabel.setAttribute('text-anchor', 'middle');
      bcLabel.setAttribute('font-size', String(BC_LABEL_FONT));
      bcLabel.setAttribute('font-weight', '600');
      bcLabel.setAttribute('fill', '#1e293b');
      bcLabel.textContent = ln;
      bcGroup.appendChild(bcLabel);
      ty += labelLH;
    });

    if (bc.team) {
      const teamLabel = document.createElementNS(SVG_NS, 'text');
      teamLabel.setAttribute('x', String(cx));
      teamLabel.setAttribute('y', String(ty + 2));
      teamLabel.setAttribute('text-anchor', 'middle');
      teamLabel.setAttribute('font-size', String(BC_TEAM_FONT));
      teamLabel.setAttribute('font-style', 'italic');
      teamLabel.setAttribute('fill', '#64748b');
      teamLabel.textContent = bc.team;
      bcGroup.appendChild(teamLabel);
    }

    container.appendChild(bcGroup);
  });

  // Relationships using Dagre edge points
  relationships.forEach((rel) => {
    const edge = g.edge(rel.source, rel.target);
    if (!edge || !edge.points || edge.points.length === 0) return;

    const shiftedPoints: Pt[] = edge.points.map((p: { x: number; y: number }) => ({
      x: gridStartX + p.x,
      y: gridStartY + p.y,
    }));

    const pattern: RelPattern | null = rel.label ? classifyRelationship(rel.label) : null;
    const symmetric = !pattern || pattern.kind !== 'directional';

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', pattern ? `d5-rel d5-rel-${pattern.badge || 'sw'}` : 'd5-rel');
    if (pattern) {
      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = pattern.name;
      group.appendChild(title);
    }

    const strokeW = pattern?.thick ? 3 : pattern?.doubleStroke ? 4 : 1.5;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', generateCurvePath(shiftedPoints));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', REL_STROKE);
    path.setAttribute('stroke-width', String(strokeW));
    if (pattern?.dashed) path.setAttribute('stroke-dasharray', '7 5');
    if (!symmetric) path.setAttribute('marker-end', 'url(#d5-arrowhead)');
    group.appendChild(path);

    // Shared Kernel: a thin white centre line turns the heavy stroke into a rail pair.
    if (pattern?.doubleStroke) {
      const inner = document.createElementNS(SVG_NS, 'path');
      inner.setAttribute('d', generateCurvePath(shiftedPoints));
      inner.setAttribute('fill', 'none');
      inner.setAttribute('stroke', 'white');
      inner.setAttribute('stroke-width', '1.5');
      group.appendChild(inner);
    }

    // Endpoint decorations for directional patterns.
    if (pattern && pattern.kind === 'directional' && shiftedPoints.length >= 2) {
      const p0 = shiftedPoints[0];
      const p1 = shiftedPoints[1];
      const pN = shiftedPoints[shiftedPoints.length - 1];
      const pN1 = shiftedPoints[shiftedPoints.length - 2];
      if (pattern.upstreamRole) {
        const m = pointAlong(p0, p1, 16);
        group.appendChild(roleMarker(m.x, m.y, pattern.upstreamRole));
      }
      if (pattern.downstreamRole) {
        const m = pointAlong(pN, pN1, 20);
        group.appendChild(roleMarker(m.x, m.y, pattern.downstreamRole));
      }
      if (pattern.aclGate) {
        const m = pointAlong(pN, pN1, 40);
        group.appendChild(aclGate(m.x, m.y, angleDeg(pN1, pN)));
      }
      if (pattern.ohsSocket) {
        const m = pointAlong(p0, p1, 34);
        group.appendChild(ohsSocket(m.x, m.y));
      }
    }

    if (rel.label) {
      let lx: number;
      let ly: number;
      if (typeof edge.x === 'number' && typeof edge.y === 'number') {
        lx = gridStartX + edge.x;
        ly = gridStartY + edge.y;
      } else {
        const mid = shiftedPoints[Math.floor(shiftedPoints.length / 2)];
        lx = mid.x;
        ly = mid.y;
      }
      if (pattern && pattern.badge) {
        group.appendChild(patternBadge(lx, ly, pattern.badge));
      } else if (!pattern) {
        group.appendChild(
          createEdgeLabel({ x: lx, y: ly, text: rel.label, maxWidth: REL_LABEL_MAX_WIDTH }),
        );
      }
    }

    container.appendChild(group);
  });

  // Legend
  const legendGroup = document.createElementNS(SVG_NS, 'g');
  legendGroup.setAttribute('class', 'd5-legend');
  const legendY = totalH - LEGEND_H * (usedPatterns.length > 0 ? 2 : 1);

  let legendX = MARGIN;
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

  // Second row: the context-map patterns present in this diagram.
  if (usedPatterns.length > 0) {
    let px = MARGIN;
    const py = legendY + LEGEND_H;
    usedPatterns.forEach((p) => {
      if (p.badge) {
        legendGroup.appendChild(patternBadge(px + 15, py + 7, p.badge));
        px += 34;
      } else {
        const dash = document.createElementNS(SVG_NS, 'line');
        dash.setAttribute('x1', String(px));
        dash.setAttribute('y1', String(py + 7));
        dash.setAttribute('x2', String(px + 22));
        dash.setAttribute('y2', String(py + 7));
        dash.setAttribute('stroke', REL_STROKE);
        dash.setAttribute('stroke-dasharray', '4 3');
        legendGroup.appendChild(dash);
        px += 28;
      }
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String(px + 4));
      label.setAttribute('y', String(py + 11));
      label.setAttribute('font-size', '11');
      label.setAttribute('fill', '#64748b');
      label.textContent = p.name;
      legendGroup.appendChild(label);
      px += measureText(p.name, { size: 11 }) + 22;
    });
  }

  container.appendChild(legendGroup);
}
