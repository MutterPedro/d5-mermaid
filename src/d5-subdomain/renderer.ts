import type { D5SubdomainDb } from './db.js';
import type { SubdomainType } from './db.js';
import dagre from '@dagrejs/dagre';

const SVG_NS = 'http://www.w3.org/2000/svg';

const BC_RX = 80;
const BC_RY = 28;
const BC_WIDTH = BC_RX * 2;
const BC_HEIGHT = BC_RY * 2;
const TITLE_HEIGHT = 40;
const MARGIN = 30;
const ARROW_MARKER_SIZE = 8;
const BC_LABEL_FONT = 12;
const BC_TEAM_FONT = 10;
const LEGEND_H = 30;
const SUBDOMAIN_LABEL_H = 24;
const CLUSTER_PADDING_X = 20;
const CLUSTER_PADDING_Y_TOP = SUBDOMAIN_LABEL_H + 12;
const CLUSTER_PADDING_Y_BOTTOM = 16;
const NODESEP = 40;
const RANKSEP = 60;

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

export function render(db: D5SubdomainDb, container: SVGSVGElement): void {
  addArrowMarker(container);

  const title = db.getTitle();
  const subdomains = db.getSubdomains();
  const boundedContexts = db.getBoundedContexts();
  const relationships = db.getRelationships();

  // Build compound Dagre graph: subdomains as clusters, BCs as child nodes
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: 'TB',
    nodesep: NODESEP,
    ranksep: RANKSEP,
    edgesep: 20,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const subdomainIds = new Set(subdomains.map((s) => s.id));

  subdomains.forEach((sd) => {
    g.setNode(sd.id, {
      label: sd.label,
      clusterLabelPos: 'top',
      paddingTop: CLUSTER_PADDING_Y_TOP,
      paddingBottom: CLUSTER_PADDING_Y_BOTTOM,
      paddingLeft: CLUSTER_PADDING_X,
      paddingRight: CLUSTER_PADDING_X,
    });
  });

  boundedContexts.forEach((bc) => {
    g.setNode(bc.id, { width: BC_WIDTH, height: BC_HEIGHT });
    if (bc.subdomainId && subdomainIds.has(bc.subdomainId)) {
      g.setParent(bc.id, bc.subdomainId);
    }
  });

  relationships.forEach((rel) => {
    g.setEdge(rel.source, rel.target, { minlen: 1 });
  });

  dagre.layout(g);

  const graphW = g.graph().width || 0;
  const graphH = g.graph().height || 0;

  const gridStartX = MARGIN;
  const gridStartY = MARGIN + (title ? TITLE_HEIGHT : 0);

  const totalW = gridStartX + graphW + MARGIN;
  const totalH = gridStartY + graphH + LEGEND_H + MARGIN;

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
    const w = node.width;
    const h = node.height;
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

    const bcGroup = document.createElementNS(SVG_NS, 'g');
    bcGroup.setAttribute('class', 'd5-bounded-context');

    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    ellipse.setAttribute('cx', String(cx));
    ellipse.setAttribute('cy', String(cy));
    ellipse.setAttribute('rx', String(BC_RX));
    ellipse.setAttribute('ry', String(BC_RY));
    ellipse.setAttribute('fill', 'white');
    ellipse.setAttribute('stroke', colors.stroke);
    ellipse.setAttribute('stroke-width', '2');
    bcGroup.appendChild(ellipse);

    const bcLabel = document.createElementNS(SVG_NS, 'text');
    bcLabel.setAttribute('x', String(cx));
    bcLabel.setAttribute('y', String(cy + (bc.team ? -4 : 4)));
    bcLabel.setAttribute('text-anchor', 'middle');
    bcLabel.setAttribute('font-size', String(BC_LABEL_FONT));
    bcLabel.setAttribute('font-weight', '600');
    bcLabel.setAttribute('fill', '#1e293b');
    bcLabel.textContent = bc.label;
    bcGroup.appendChild(bcLabel);

    if (bc.team) {
      const teamLabel = document.createElementNS(SVG_NS, 'text');
      teamLabel.setAttribute('x', String(cx));
      teamLabel.setAttribute('y', String(cy + 12));
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

    const shiftedPoints = edge.points.map((p) => ({
      x: gridStartX + p.x,
      y: gridStartY + p.y,
    }));

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-rel');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', generateCurvePath(shiftedPoints));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#64748b');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('marker-end', 'url(#d5-arrowhead)');
    group.appendChild(path);

    if (rel.label) {
      const midIdx = Math.floor(shiftedPoints.length / 2);
      const midX = shiftedPoints[midIdx].x;
      const midY = shiftedPoints[midIdx].y;

      const labelBg = document.createElementNS(SVG_NS, 'rect');
      labelBg.setAttribute('x', String(midX - 50));
      labelBg.setAttribute('y', String(midY - 10));
      labelBg.setAttribute('width', '100');
      labelBg.setAttribute('height', '18');
      labelBg.setAttribute('rx', '4');
      labelBg.setAttribute('fill', 'white');
      labelBg.setAttribute('stroke', '#cbd5e1');
      labelBg.setAttribute('stroke-width', '1');
      group.appendChild(labelBg);

      const labelText = document.createElementNS(SVG_NS, 'text');
      labelText.setAttribute('x', String(midX));
      labelText.setAttribute('y', String(midY + 3));
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('font-size', '10');
      labelText.setAttribute('font-weight', '600');
      labelText.setAttribute('fill', '#475569');
      labelText.textContent = rel.label;
      group.appendChild(labelText);
    }

    container.appendChild(group);
  });

  // Legend
  const legendY = totalH - LEGEND_H;
  const legendGroup = document.createElementNS(SVG_NS, 'g');
  legendGroup.setAttribute('class', 'd5-legend');

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

  container.appendChild(legendGroup);
}
