import type { D5DomainDb, SubdomainType } from './db.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SUBDOMAIN_WIDTH = 180;
const SUBDOMAIN_HEIGHT = 70;
const GRID_COLS = 3;
const GRID_GAP = 40;
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

function edgePoint(
  cx: number,
  cy: number,
  w: number,
  h: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = w / 2;
  const hh = h / 2;
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function render(db: D5DomainDb, container: SVGSVGElement): void {
  addArrowMarker(container);

  const subdomains = db.getSubdomains();
  const domain = db.getDomain();

  const cols = Math.min(subdomains.length, GRID_COLS);
  const rows = Math.ceil(subdomains.length / GRID_COLS);

  const gridW = cols * SUBDOMAIN_WIDTH + (cols - 1) * GRID_GAP;
  const gridH = rows * SUBDOMAIN_HEIGHT + (rows - 1) * GRID_GAP;

  const domainX = DOMAIN_PADDING;
  const domainY = TITLE_HEIGHT + DOMAIN_PADDING;
  const domainW = gridW + DOMAIN_PADDING * 2;
  const domainH = DOMAIN_HEADER + gridH + DOMAIN_PADDING * 2;

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
    domainLabel.setAttribute('x', String(domainX + 12));
    domainLabel.setAttribute('y', String(domainY + 22));
    domainLabel.setAttribute('font-size', '14');
    domainLabel.setAttribute('font-weight', '600');
    domainLabel.setAttribute('fill', '#475569');
    domainLabel.textContent = domain.label;
    domainGroup.appendChild(domainLabel);
  }

  container.appendChild(domainGroup);

  // Subdomains inside domain
  const subdomainCenters = new Map<string, { cx: number; cy: number }>();
  const gridStartX = domainX + DOMAIN_PADDING;
  const gridStartY = domainY + DOMAIN_HEADER + DOMAIN_PADDING;

  subdomains.forEach((sd, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = gridStartX + col * (SUBDOMAIN_WIDTH + GRID_GAP);
    const y = gridStartY + row * (SUBDOMAIN_HEIGHT + GRID_GAP);
    const cx = x + SUBDOMAIN_WIDTH / 2;
    const cy = y + SUBDOMAIN_HEIGHT / 2;

    subdomainCenters.set(sd.id, { cx, cy });

    const colors = SUBDOMAIN_COLORS[sd.type];

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `d5-subdomain d5-subdomain-${sd.type}`);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(SUBDOMAIN_WIDTH));
    rect.setAttribute('height', String(SUBDOMAIN_HEIGHT));
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', colors.fill);
    rect.setAttribute('stroke', colors.stroke);
    rect.setAttribute('stroke-width', '2');
    g.appendChild(rect);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(cx));
    labelText.setAttribute('y', String(cy - 4));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '13');
    labelText.setAttribute('font-weight', '600');
    labelText.setAttribute('fill', '#1e293b');
    labelText.textContent = sd.label;
    g.appendChild(labelText);

    const typeText = document.createElementNS(SVG_NS, 'text');
    typeText.setAttribute('x', String(cx));
    typeText.setAttribute('y', String(cy + 16));
    typeText.setAttribute('text-anchor', 'middle');
    typeText.setAttribute('font-size', '11');
    typeText.setAttribute('fill', colors.stroke);
    typeText.textContent = sd.type;
    g.appendChild(typeText);

    container.appendChild(g);
  });

  // Relationships as arrows
  const relationships = db.getRelationships();
  relationships.forEach((rel) => {
    const src = subdomainCenters.get(rel.source);
    const tgt = subdomainCenters.get(rel.target);
    if (!src || !tgt) return;

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'd5-rel');

    const p1 = edgePoint(src.cx, src.cy, SUBDOMAIN_WIDTH, SUBDOMAIN_HEIGHT, tgt.cx, tgt.cy);
    const p2 = edgePoint(tgt.cx, tgt.cy, SUBDOMAIN_WIDTH, SUBDOMAIN_HEIGHT, src.cx, src.cy);

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(p1.x));
    line.setAttribute('y1', String(p1.y));
    line.setAttribute('x2', String(p2.x));
    line.setAttribute('y2', String(p2.y));
    line.setAttribute('stroke', '#64748b');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('marker-end', 'url(#d5-arrowhead)');
    g.appendChild(line);

    if (rel.label) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const labelBg = document.createElementNS(SVG_NS, 'rect');
      labelBg.setAttribute('x', String(midX - 40));
      labelBg.setAttribute('y', String(midY - 10));
      labelBg.setAttribute('width', '80');
      labelBg.setAttribute('height', '18');
      labelBg.setAttribute('rx', '4');
      labelBg.setAttribute('fill', 'white');
      labelBg.setAttribute('stroke', '#cbd5e1');
      labelBg.setAttribute('stroke-width', '1');
      g.appendChild(labelBg);

      const labelText = document.createElementNS(SVG_NS, 'text');
      labelText.setAttribute('x', String(midX));
      labelText.setAttribute('y', String(midY + 3));
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('font-size', '10');
      labelText.setAttribute('fill', '#475569');
      labelText.textContent = rel.label;
      g.appendChild(labelText);
    }

    container.appendChild(g);
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
