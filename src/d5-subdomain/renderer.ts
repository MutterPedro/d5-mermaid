import type { D5SubdomainDb } from './db.js';
import type { SubdomainType } from './db.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const BC_RX = 80;
const BC_RY = 28;
const BC_SPACING_Y = 70;
const SUBDOMAIN_PADDING = 30;
const SUBDOMAIN_GAP = 50;
const GRID_COLS = 3;
const TITLE_HEIGHT = 40;
const MARGIN = 30;
const ARROW_MARKER_SIZE = 8;
const BC_LABEL_FONT = 12;
const BC_TEAM_FONT = 10;

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

function ellipseEdgePoint(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const angle = Math.atan2(dy, dx);
  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  };
}

export function render(db: D5SubdomainDb, container: SVGSVGElement): void {
  addArrowMarker(container);

  const title = db.getTitle();
  const subdomains = db.getSubdomains();
  const boundedContexts = db.getBoundedContexts();
  const relationships = db.getRelationships();

  // Compute subdomain box sizes based on BC count
  interface SubdomainLayout {
    id: string;
    label: string;
    type: SubdomainType;
    bcCount: number;
    width: number;
    height: number;
    x: number;
    y: number;
  }

  const layouts: SubdomainLayout[] = subdomains.map((sd) => {
    const bcs = boundedContexts.filter((bc) => bc.subdomainId === sd.id);
    const bcCount = Math.max(bcs.length, 1);
    const width = BC_RX * 2 + SUBDOMAIN_PADDING * 2;
    const height = SUBDOMAIN_PADDING + 24 + bcCount * BC_SPACING_Y + SUBDOMAIN_PADDING;
    return { id: sd.id, label: sd.label, type: sd.type, bcCount, width, height, x: 0, y: 0 };
  });

  // Grid layout for subdomains
  const cols = Math.min(layouts.length, GRID_COLS);
  const colWidths: number[] = [];
  for (let c = 0; c < cols; c++) {
    let maxW = 0;
    for (let i = c; i < layouts.length; i += GRID_COLS) {
      maxW = Math.max(maxW, layouts[i].width);
    }
    colWidths.push(maxW);
  }

  const rows = Math.ceil(layouts.length / GRID_COLS);
  const rowHeights: number[] = [];
  for (let r = 0; r < rows; r++) {
    let maxH = 0;
    for (let c = 0; c < cols; c++) {
      const idx = r * GRID_COLS + c;
      if (idx < layouts.length) maxH = Math.max(maxH, layouts[idx].height);
    }
    rowHeights.push(maxH);
  }

  const gridStartX = MARGIN;
  const gridStartY = MARGIN + (title ? TITLE_HEIGHT : 0);

  layouts.forEach((lay, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    let x = gridStartX;
    for (let c = 0; c < col; c++) x += colWidths[c] + SUBDOMAIN_GAP;
    let y = gridStartY;
    for (let r = 0; r < row; r++) y += rowHeights[r] + SUBDOMAIN_GAP;
    lay.x = x;
    lay.y = y;
  });

  const totalW =
    gridStartX + colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * SUBDOMAIN_GAP + MARGIN;
  const legendH = 30;
  const totalH =
    gridStartY +
    rowHeights.reduce((a, b) => a + b, 0) +
    (rows - 1) * SUBDOMAIN_GAP +
    legendH +
    MARGIN;

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

  // Render subdomains and BCs
  const bcCenters = new Map<string, { cx: number; cy: number }>();

  layouts.forEach((lay) => {
    const colors = SUBDOMAIN_COLORS[lay.type];
    const bcsInSd = boundedContexts.filter((bc) => bc.subdomainId === lay.id);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `d5-subdomain d5-subdomain-${lay.type}`);

    // Subdomain rounded rect
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(lay.x));
    rect.setAttribute('y', String(lay.y));
    rect.setAttribute('width', String(lay.width));
    rect.setAttribute('height', String(lay.height));
    rect.setAttribute('rx', '12');
    rect.setAttribute('fill', colors.fill);
    rect.setAttribute('stroke', colors.stroke);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('stroke-dasharray', '8 4');
    g.appendChild(rect);

    // Subdomain label
    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(lay.x + lay.width / 2));
    labelText.setAttribute('y', String(lay.y + 20));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '13');
    labelText.setAttribute('font-weight', '600');
    labelText.setAttribute('fill', '#1e293b');
    labelText.textContent = lay.label;
    g.appendChild(labelText);

    // Bounded contexts as ellipses
    bcsInSd.forEach((bc, bcIdx) => {
      const cx = lay.x + lay.width / 2;
      const cy = lay.y + SUBDOMAIN_PADDING + 24 + bcIdx * BC_SPACING_Y + BC_RY;

      bcCenters.set(bc.id, { cx, cy });

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

      g.appendChild(bcGroup);
    });

    container.appendChild(g);
  });

  // Relationships as arrows between BCs
  relationships.forEach((rel) => {
    const src = bcCenters.get(rel.source);
    const tgt = bcCenters.get(rel.target);
    if (!src || !tgt) return;

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'd5-rel');

    const p1 = ellipseEdgePoint(src.cx, src.cy, BC_RX, BC_RY, tgt.cx, tgt.cy);
    const p2 = ellipseEdgePoint(tgt.cx, tgt.cy, BC_RX, BC_RY, src.cx, src.cy);

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
      labelBg.setAttribute('x', String(midX - 50));
      labelBg.setAttribute('y', String(midY - 10));
      labelBg.setAttribute('width', '100');
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
      labelText.setAttribute('font-weight', '600');
      labelText.setAttribute('fill', '#475569');
      labelText.textContent = rel.label;
      g.appendChild(labelText);
    }

    container.appendChild(g);
  });

  // Legend
  const legendY = totalH - legendH;
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
