import type { D5ContextDb } from './db.js';
import dagre from '@dagrejs/dagre';

const SVG_NS = 'http://www.w3.org/2000/svg';

const AGGREGATE_WIDTH = 180;
const AGGREGATE_MIN_HEIGHT = 76;
const AGGREGATE_FIELD_HEIGHT = 20;

const GRID_GAP = 60; // Slightly larger for better graph breathing room

const MARGIN = 30;
const TITLE_HEIGHT = 40;
const BC_PADDING = 30;
const BC_HEADER = 36;
const NOTE_WIDTH = 280;
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
    // Quadratic midpoint smoothing
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    d += ` Q ${p1.x} ${p1.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function render(db: D5ContextDb, container: SVGSVGElement): void {
  addArrowMarker(container);

  const title = db.getTitle();
  const bc = db.getBoundedContext();
  const aggregates = db.getAggregates();
  const terms = db.getTerms();
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

  aggregates.forEach((agg) => {
    const h =
      AGGREGATE_MIN_HEIGHT +
      (agg.fields?.length ? agg.fields.length * AGGREGATE_FIELD_HEIGHT + 10 : 0);
    g.setNode(agg.id, { width: AGGREGATE_WIDTH, height: h });
  });

  relationships.forEach((rel) => {
    g.setEdge(rel.source, rel.target, { minlen: 1 });
  });

  // Calculate coordinates
  dagre.layout(g);

  // Compute graph bounds 
  let graphW = g.graph().width || 0;
  let graphH = g.graph().height || 0;

  const hasTerms = terms.length > 0;
  const noteH = hasTerms ? 40 + terms.length * 40 + 10 : 0;

  const innerGridW = graphW + (hasTerms ? (graphW > 0 ? GRID_GAP : 0) + NOTE_WIDTH : 0);
  const innerGridH = Math.max(graphH, noteH);

  let bcX = MARGIN;
  const bcY = MARGIN + (title ? TITLE_HEIGHT : 0);
  let bcW = innerGridW + BC_PADDING * 2;
  if (!bc && !hasTerms && aggregates.length === 0) bcW = 400; // fallback
  const bcH = (bc ? BC_HEADER : 0) + innerGridH + BC_PADDING * 2;

  const totalW = bcX + bcW + MARGIN;
  const totalH = bcY + bcH + MARGIN;

  container.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  container.setAttribute('height', String(totalH));
  container.style.maxWidth = `${totalW}px`;

  // Draw Title
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

  // Draw Bounded Context Box
  const bcGroup = document.createElementNS(SVG_NS, 'g');
  bcGroup.setAttribute('class', 'd5-bounded-context');

  const bcRect = document.createElementNS(SVG_NS, 'rect');
  bcRect.setAttribute('x', String(bcX));
  bcRect.setAttribute('y', String(bcY));
  bcRect.setAttribute('width', String(bcW));
  bcRect.setAttribute('height', String(bcH));
  bcRect.setAttribute('rx', '12');
  bcRect.setAttribute('fill', '#f8fafc');
  bcRect.setAttribute('stroke', '#94a3b8');
  bcRect.setAttribute('stroke-width', '2');
  bcRect.setAttribute('stroke-dasharray', '8 4');
  bcGroup.appendChild(bcRect);

  if (bc) {
    const bcLabel = document.createElementNS(SVG_NS, 'text');
    bcLabel.setAttribute('x', String(bcX + 16));
    bcLabel.setAttribute('y', String(bcY + 24));
    bcLabel.setAttribute('font-size', '14');
    bcLabel.setAttribute('font-weight', '600');
    bcLabel.setAttribute('fill', '#475569');
    bcLabel.textContent = bc.label;
    bcGroup.appendChild(bcLabel);

    if (bc.team) {
      const teamLabel = document.createElementNS(SVG_NS, 'text');
      teamLabel.setAttribute('x', String(bcX + bcW - 16));
      teamLabel.setAttribute('y', String(bcY + 24));
      teamLabel.setAttribute('font-size', '12');
      teamLabel.setAttribute('font-style', 'italic');
      teamLabel.setAttribute('fill', '#64748b');
      teamLabel.setAttribute('text-anchor', 'end');
      teamLabel.textContent = `Team: ${bc.team}`;
      bcGroup.appendChild(teamLabel);
    }
  }
  container.appendChild(bcGroup);

  const graphStartX = bcX + BC_PADDING;
  const graphStartY = bcY + (bc ? BC_HEADER : 0) + BC_PADDING;

  // Draw Language Note
  if (hasTerms) {
    const noteX = graphStartX + (graphW > 0 ? graphW + GRID_GAP : 0);
    const noteY = graphStartY;

    const noteGroup = document.createElementNS(SVG_NS, 'g');
    noteGroup.setAttribute('class', 'd5-language-note');

    const noteRect = document.createElementNS(SVG_NS, 'rect');
    noteRect.setAttribute('x', String(noteX));
    noteRect.setAttribute('y', String(noteY));
    noteRect.setAttribute('width', String(NOTE_WIDTH));
    noteRect.setAttribute('height', String(noteH));
    noteRect.setAttribute('rx', '4');
    noteRect.setAttribute('fill', '#fef9c3');
    noteRect.setAttribute('stroke', '#ca8a04');
    noteRect.setAttribute('stroke-width', '1.5');
    noteGroup.appendChild(noteRect);

    const noteTop = document.createElementNS(SVG_NS, 'path');
    noteTop.setAttribute(
      'd',
      `M${noteX},${noteY + 26} L${noteX},${noteY + 4} Q${noteX},${noteY} ${noteX + 4},${noteY} L${noteX + NOTE_WIDTH - 4},${noteY} Q${noteX + NOTE_WIDTH},${noteY} ${noteX + NOTE_WIDTH},${noteY + 4} L${noteX + NOTE_WIDTH},${noteY + 26} Z`,
    );
    noteTop.setAttribute('fill', '#fde047');
    noteGroup.appendChild(noteTop);

    const noteTitle = document.createElementNS(SVG_NS, 'text');
    noteTitle.setAttribute('x', String(noteX + NOTE_WIDTH / 2));
    noteTitle.setAttribute('y', String(noteY + 18));
    noteTitle.setAttribute('text-anchor', 'middle');
    noteTitle.setAttribute('font-size', '12');
    noteTitle.setAttribute('font-weight', 'bold');
    noteTitle.setAttribute('fill', '#854d0e');
    noteTitle.textContent = 'Ubiquitous Language';
    noteGroup.appendChild(noteTitle);

    let ty = noteY + 44;
    terms.forEach((term) => {
      const termEl = document.createElementNS(SVG_NS, 'text');
      termEl.setAttribute('x', String(noteX + 12));
      termEl.setAttribute('y', String(ty));
      termEl.setAttribute('font-size', '12');
      termEl.setAttribute('font-weight', 'bold');
      termEl.setAttribute('fill', '#713f12');
      termEl.textContent = term.term + ':';
      noteGroup.appendChild(termEl);

      ty += 16;

      const defEl = document.createElementNS(SVG_NS, 'text');
      defEl.setAttribute('x', String(noteX + 12));
      defEl.setAttribute('y', String(ty));
      defEl.setAttribute('font-size', '11');
      defEl.setAttribute('fill', '#854d0e');
      defEl.textContent = term.definition;
      noteGroup.appendChild(defEl);

      ty += 20;
    });

    container.appendChild(noteGroup);
  }

  // Draw Aggregates using Dagre node positions
  aggregates.forEach((agg) => {
    const node = g.node(agg.id);
    if (!node) return;

    // Node bounds. Dagre x/y represent the center.
    const w = node.width;
    const h = node.height;
    const x = graphStartX + node.x - w / 2;
    const y = graphStartY + node.y - h / 2;
    const cx = x + w / 2;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-aggregate');

    // Box
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', 'white');
    rect.setAttribute('stroke', '#3b82f6');
    rect.setAttribute('stroke-width', '2');
    group.appendChild(rect);

    // Header
    const headerH = 34;
    const header = document.createElementNS(SVG_NS, 'path');
    header.setAttribute(
      'd',
      `M${x},${y + headerH} L${x},${y + 8} Q${x},${y} ${x + 8},${y} L${x + w - 8},${y} Q${x + w},${y} ${x + w},${y + 8} L${x + w},${y + headerH} Z`,
    );
    header.setAttribute('fill', '#dbeafe');
    group.appendChild(header);

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', String(y + headerH));
    line.setAttribute('x2', String(x + w));
    line.setAttribute('y2', String(y + headerH));
    line.setAttribute('stroke', '#3b82f6');
    line.setAttribute('stroke-width', '1.5');
    group.appendChild(line);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(cx));
    labelText.setAttribute('y', String(y + 20));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '13');
    labelText.setAttribute('font-weight', 'bold');
    labelText.setAttribute('fill', '#1e293b');
    labelText.textContent = agg.label;
    group.appendChild(labelText);

    const rootText = document.createElementNS(SVG_NS, 'text');
    rootText.setAttribute('x', String(cx));
    rootText.setAttribute('y', String(y + headerH + 20));
    rootText.setAttribute('text-anchor', 'middle');
    rootText.setAttribute('font-size', '11');
    rootText.setAttribute('font-style', 'italic');
    rootText.setAttribute('fill', '#3b82f6');
    rootText.textContent = `Root: ${agg.root}`;
    group.appendChild(rootText);

    // Fields
    if (agg.fields && agg.fields.length > 0) {
      const sep = document.createElementNS(SVG_NS, 'line');
      sep.setAttribute('x1', String(x + 10));
      sep.setAttribute('y1', String(y + headerH + 32));
      sep.setAttribute('x2', String(x + w - 10));
      sep.setAttribute('y2', String(y + headerH + 32));
      sep.setAttribute('stroke', '#cbd5e1');
      sep.setAttribute('stroke-dasharray', '4 4');
      group.appendChild(sep);

      let fy = y + headerH + 50;
      agg.fields.forEach((field) => {
        const bullet = document.createElementNS(SVG_NS, 'circle');
        bullet.setAttribute('cx', String(x + 20));
        bullet.setAttribute('cy', String(fy - 4));
        bullet.setAttribute('r', '3');
        bullet.setAttribute('fill', '#94a3b8');
        group.appendChild(bullet);

        const fieldText = document.createElementNS(SVG_NS, 'text');
        fieldText.setAttribute('x', String(x + 30));
        fieldText.setAttribute('y', String(fy));
        fieldText.setAttribute('font-size', '12');
        fieldText.setAttribute('fill', '#475569');
        fieldText.textContent = field;
        group.appendChild(fieldText);

        fy += AGGREGATE_FIELD_HEIGHT;
      });
    }

    container.appendChild(group);
  });

  // Draw Relationships using Dagre's beautifully computed edge points
  relationships.forEach((rel) => {
    const edge = g.edge(rel.source, rel.target);
    if (!edge || !edge.points || edge.points.length === 0) return;

    // Shift points to relative coordinate space
    const shiftedPoints = edge.points.map(p => ({
      x: graphStartX + p.x,
      y: graphStartY + p.y
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
      // Find middle point in Dagre's array for label placement
      const midIdx = Math.floor(shiftedPoints.length / 2);
      const midX = shiftedPoints[midIdx].x;
      const midY = shiftedPoints[midIdx].y;

      const labelBg = document.createElementNS(SVG_NS, 'rect');
      labelBg.setAttribute('x', String(midX - 55));
      labelBg.setAttribute('y', String(midY - 10));
      labelBg.setAttribute('width', '110');
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
}
