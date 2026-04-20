import type { D5DomainDb, SubdomainType } from './db.js';
import dagre from '@dagrejs/dagre';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SUBDOMAIN_WIDTH = 180;
const SUBDOMAIN_HEIGHT = 70;
const GRID_GAP = 60; // Increased for better graph breathing room
const DOMAIN_PADDING = 30;
const TITLE_HEIGHT = 40;
const DOMAIN_HEADER = 36;
const ARROW_MARKER_SIZE = 8;

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

export function render(db: D5DomainDb, container: SVGSVGElement): void {
  addArrowMarker(container);

  const subdomains = db.getSubdomains();
  const domain = db.getDomain();
  const relationships = db.getRelationships();

  // Create Dagre Layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    nodesep: GRID_GAP,
    ranksep: GRID_GAP,
    edgesep: 20,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  subdomains.forEach((sd) => {
    g.setNode(sd.id, { width: SUBDOMAIN_WIDTH, height: SUBDOMAIN_HEIGHT });
  });

  relationships.forEach((rel) => {
    g.setEdge(rel.source, rel.target, { minlen: 1 });
  });

  dagre.layout(g);

  // Compute graph bounds
  const graphW = g.graph().width || 0;
  const graphH = g.graph().height || 0;

  const domainX = DOMAIN_PADDING;
  const domainY = (db.getTitle() ? TITLE_HEIGHT : 0) + DOMAIN_PADDING;

  let domainW = graphW + DOMAIN_PADDING * 2;
  if (!domain && subdomains.length === 0) domainW = 400; // fallback
  const domainH = (domain ? DOMAIN_HEADER : 0) + graphH + DOMAIN_PADDING * 2;

  const totalW = domainX + domainW + DOMAIN_PADDING;
  const legendH = 30;
  const totalH = domainY + domainH + legendH + DOMAIN_PADDING;

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

  // Domain boundary
  const domainGroup = document.createElementNS(SVG_NS, 'g');
  domainGroup.setAttribute('class', 'd5-domain');

  const domainRect = document.createElementNS(SVG_NS, 'rect');
  domainRect.setAttribute('x', String(domainX));
  domainRect.setAttribute('y', String(domainY));
  domainRect.setAttribute('width', String(domainW));
  domainRect.setAttribute('height', String(domainH));
  domainRect.setAttribute('rx', '12');
  domainRect.setAttribute('fill', '#f8fafc');
  domainRect.setAttribute('stroke', '#94a3b8');
  domainRect.setAttribute('stroke-width', '2');
  domainRect.setAttribute('stroke-dasharray', '8 4');
  domainGroup.appendChild(domainRect);

  if (domain) {
    const domainLabel = document.createElementNS(SVG_NS, 'text');
    domainLabel.setAttribute('x', String(domainX + 16));
    domainLabel.setAttribute('y', String(domainY + 24));
    domainLabel.setAttribute('font-size', '14');
    domainLabel.setAttribute('font-weight', '600');
    domainLabel.setAttribute('fill', '#475569');
    domainLabel.textContent = domain.label;
    domainGroup.appendChild(domainLabel);
  }

  container.appendChild(domainGroup);

  const graphStartX = domainX + DOMAIN_PADDING;
  const graphStartY = domainY + (domain ? DOMAIN_HEADER : 0) + DOMAIN_PADDING;

  // Subdomains inside domain
  subdomains.forEach((sd) => {
    const node = g.node(sd.id);
    if (!node) return;

    const w = node.width;
    const h = node.height;
    const x = graphStartX + node.x - w / 2;
    const y = graphStartY + node.y - h / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;

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

  // Relationships as arrows
  relationships.forEach((rel) => {
    const edge = g.edge(rel.source, rel.target);
    if (!edge || !edge.points || edge.points.length === 0) return;

    // Shift points to relative coordinate space
    const shiftedPoints = edge.points.map((p) => ({
      x: graphStartX + p.x,
      y: graphStartY + p.y,
    }));

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-rel');

    const pathString = generateCurvePath(shiftedPoints);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathString);
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
      labelBg.setAttribute('x', String(midX - 45));
      labelBg.setAttribute('y', String(midY - 10));
      labelBg.setAttribute('width', '90');
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
      labelText.setAttribute('fill', '#475569');
      labelText.textContent = rel.label;
      group.appendChild(labelText);
    }

    container.appendChild(group);
  });

  // Legend
  const legendY = domainY + domainH + 16;
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

  container.appendChild(legendGroup);
}

