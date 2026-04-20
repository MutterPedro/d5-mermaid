import type { D5AggregateDb } from './db.js';
import dagre from '@dagrejs/dagre';

const SVG_NS = 'http://www.w3.org/2000/svg';

const ITEM_WIDTH = 180;
const ITEM_HEIGHT = 44;
const GRID_GAP = 50;

const MARGIN = 30;
const TITLE_HEIGHT = 40;
const AGG_PADDING = 30;
const AGG_HEADER = 36;
const ARROW_MARKER_SIZE = 8;

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
  path.setAttribute('fill', '#94a3b8');
  marker.appendChild(path);
  defs.appendChild(marker);
}

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

export function render(db: D5AggregateDb, container: SVGSVGElement): void {
  addArrowMarker(container);

  const title = db.getTitle();
  const aggregate = db.getAggregate();
  const entities = db.getEntities();
  const valueObjects = db.getValueObjects();

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

  entities.forEach(e => {
    g.setNode(e.id, { width: ITEM_WIDTH, height: ITEM_HEIGHT });
  });
  valueObjects.forEach(v => {
    g.setNode(v.id, { width: ITEM_WIDTH, height: ITEM_HEIGHT });
  });

  const rootName = aggregate?.root;
  const rootEntity = entities.find(e => e.label === rootName);
  const rootId = rootEntity?.id;

  if (rootId) {
    entities.forEach(e => {
      if (e.id !== rootId) g.setEdge(rootId, e.id, { minlen: 1 });
    });
    valueObjects.forEach(v => {
      g.setEdge(rootId, v.id, { minlen: 1 });
    });
  }

  dagre.layout(g);

  let graphW = g.graph().width || 0;
  let graphH = g.graph().height || 0;

  const innerGridW = Math.max(graphW, 300);
  const innerGridH = Math.max(graphH, 100);

  const aggX = MARGIN;
  const aggY = MARGIN + (title ? TITLE_HEIGHT : 0);
  const aggW = innerGridW + AGG_PADDING * 2;
  const aggH = (aggregate ? AGG_HEADER : 0) + innerGridH + AGG_PADDING * 2;

  const legendH = 30;
  const totalW = aggX + aggW + MARGIN;
  const totalH = aggY + aggH + legendH + MARGIN;

  container.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  container.setAttribute('height', String(totalH));
  container.style.maxWidth = `${totalW}px`;

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

  if (aggregate) {
    const aggGroup = document.createElementNS(SVG_NS, 'g');
    aggGroup.setAttribute('class', 'd5-aggregate');

    const aggRect = document.createElementNS(SVG_NS, 'rect');
    aggRect.setAttribute('x', String(aggX));
    aggRect.setAttribute('y', String(aggY));
    aggRect.setAttribute('width', String(aggW));
    aggRect.setAttribute('height', String(aggH));
    aggRect.setAttribute('rx', '12');
    aggRect.setAttribute('fill', '#f8fafc');
    aggRect.setAttribute('stroke', '#94a3b8');
    aggRect.setAttribute('stroke-width', '2');
    aggRect.setAttribute('stroke-dasharray', '8 4');
    aggGroup.appendChild(aggRect);

    const aggLabel = document.createElementNS(SVG_NS, 'text');
    aggLabel.setAttribute('x', String(aggX + 16));
    aggLabel.setAttribute('y', String(aggY + 24));
    aggLabel.setAttribute('font-size', '14');
    aggLabel.setAttribute('font-weight', '600');
    aggLabel.setAttribute('fill', '#475569');
    aggLabel.textContent = `Aggregate: ${aggregate.label}`;
    aggGroup.appendChild(aggLabel);

    container.appendChild(aggGroup);
  }

  const graphStartX = aggX + (aggW - graphW) / 2;
  const graphStartY = aggY + (aggregate ? AGG_HEADER : 0) + AGG_PADDING;

  g.edges().forEach((eInfo) => {
    const edge = g.edge(eInfo);
    if (!edge || !edge.points) return;

    const shiftedPoints = edge.points.map((p) => ({
      x: graphStartX + p.x,
      y: graphStartY + p.y,
    }));

    const pathString = generateCurvePath(shiftedPoints);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathString);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#94a3b8');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('marker-end', 'url(#d5-arrowhead)');
    container.appendChild(path);
  });

  entities.forEach(e => {
    const node = g.node(e.id);
    if (!node) return;

    const w = node.width;
    const h = node.height;
    const x = graphStartX + node.x - w / 2;
    const y = graphStartY + node.y - h / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', e.id === rootId ? 'd5-entity d5-aggregate-root' : 'd5-entity');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '6');
    rect.setAttribute('fill', 'white');
    rect.setAttribute('stroke', '#3b82f6');
    rect.setAttribute('stroke-width', e.id === rootId ? '3' : '2');
    group.appendChild(rect);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(cx));
    labelText.setAttribute('y', String(cy - 2));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '13');
    labelText.setAttribute('font-weight', e.id === rootId ? 'bold' : '600');
    labelText.setAttribute('fill', '#1e293b');
    labelText.textContent = e.label;
    group.appendChild(labelText);

    const typeText = document.createElementNS(SVG_NS, 'text');
    typeText.setAttribute('x', String(cx));
    typeText.setAttribute('y', String(cy + 14));
    typeText.setAttribute('text-anchor', 'middle');
    typeText.setAttribute('font-size', '10');
    typeText.setAttribute('font-style', 'italic');
    typeText.setAttribute('fill', '#3b82f6');
    typeText.textContent = e.id === rootId ? 'Root Entity' : 'Entity';
    group.appendChild(typeText);

    container.appendChild(group);
  });

  valueObjects.forEach(v => {
    const node = g.node(v.id);
    if (!node) return;

    const w = node.width;
    const h = node.height;
    const x = graphStartX + node.x - w / 2;
    const y = graphStartY + node.y - h / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-value-object');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', String(h / 2));
    rect.setAttribute('fill', 'white');
    rect.setAttribute('stroke', '#10b981');
    rect.setAttribute('stroke-width', '2');
    group.appendChild(rect);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(cx));
    labelText.setAttribute('y', String(cy - 2));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '13');
    labelText.setAttribute('font-weight', '600');
    labelText.setAttribute('fill', '#1e293b');
    labelText.textContent = v.label;
    group.appendChild(labelText);

    const typeText = document.createElementNS(SVG_NS, 'text');
    typeText.setAttribute('x', String(cx));
    typeText.setAttribute('y', String(cy + 14));
    typeText.setAttribute('text-anchor', 'middle');
    typeText.setAttribute('font-size', '10');
    typeText.setAttribute('font-style', 'italic');
    typeText.setAttribute('fill', '#10b981');
    typeText.textContent = 'Value Object';
    group.appendChild(typeText);

    container.appendChild(group);
  });

  const legendY = aggY + aggH + 16;
  const legendGroup = document.createElementNS(SVG_NS, 'g');
  legendGroup.setAttribute('class', 'd5-legend');

  let legendX = aggX;

  const rootSwatch = document.createElementNS(SVG_NS, 'rect');
  rootSwatch.setAttribute('x', String(legendX));
  rootSwatch.setAttribute('y', String(legendY));
  rootSwatch.setAttribute('width', '14');
  rootSwatch.setAttribute('height', '14');
  rootSwatch.setAttribute('rx', '3');
  rootSwatch.setAttribute('fill', 'white');
  rootSwatch.setAttribute('stroke', '#3b82f6');
  rootSwatch.setAttribute('stroke-width', '3');
  legendGroup.appendChild(rootSwatch);

  const rootLabel = document.createElementNS(SVG_NS, 'text');
  rootLabel.setAttribute('x', String(legendX + 20));
  rootLabel.setAttribute('y', String(legendY + 11));
  rootLabel.setAttribute('font-size', '11');
  rootLabel.setAttribute('fill', '#64748b');
  rootLabel.textContent = 'Root Entity';
  legendGroup.appendChild(rootLabel);

  legendX += 100;

  const entSwatch = document.createElementNS(SVG_NS, 'rect');
  entSwatch.setAttribute('x', String(legendX));
  entSwatch.setAttribute('y', String(legendY));
  entSwatch.setAttribute('width', '14');
  entSwatch.setAttribute('height', '14');
  entSwatch.setAttribute('rx', '3');
  entSwatch.setAttribute('fill', 'white');
  entSwatch.setAttribute('stroke', '#3b82f6');
  entSwatch.setAttribute('stroke-width', '2');
  legendGroup.appendChild(entSwatch);

  const entLabel = document.createElementNS(SVG_NS, 'text');
  entLabel.setAttribute('x', String(legendX + 20));
  entLabel.setAttribute('y', String(legendY + 11));
  entLabel.setAttribute('font-size', '11');
  entLabel.setAttribute('fill', '#64748b');
  entLabel.textContent = 'Entity';
  legendGroup.appendChild(entLabel);

  legendX += 80;

  const voSwatch = document.createElementNS(SVG_NS, 'rect');
  voSwatch.setAttribute('x', String(legendX));
  voSwatch.setAttribute('y', String(legendY));
  voSwatch.setAttribute('width', '14');
  voSwatch.setAttribute('height', '14');
  voSwatch.setAttribute('rx', '7');
  voSwatch.setAttribute('fill', 'white');
  voSwatch.setAttribute('stroke', '#10b981');
  voSwatch.setAttribute('stroke-width', '2');
  legendGroup.appendChild(voSwatch);

  const voLabel = document.createElementNS(SVG_NS, 'text');
  voLabel.setAttribute('x', String(legendX + 20));
  voLabel.setAttribute('y', String(legendY + 11));
  voLabel.setAttribute('font-size', '11');
  voLabel.setAttribute('fill', '#64748b');
  voLabel.textContent = 'Value Object';
  legendGroup.appendChild(voLabel);

  container.appendChild(legendGroup);
}
