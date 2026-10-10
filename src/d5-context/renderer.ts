import type { D5ContextReadable } from './db.js';
import dagre from '@dagrejs/dagre';
import { createEdgeLabel, edgeLabelSize } from '../shared/edge-label.js';
import { measureText, wrapText, lineHeight, type FontSpec } from '../shared/text.js';
import { finiteOr0 } from '../shared/shape.js';
import { generateCurvePath } from '../shared/curve.js';
import { innerBounds, stretchAxis, type Rect } from '../shared/boundary.js';

const REL_LABEL_MAX_WIDTH = 150;

const SVG_NS = 'http://www.w3.org/2000/svg';

const AGGREGATE_MIN_WIDTH = 180;
const AGGREGATE_MAX_WIDTH = 340;
const AGGREGATE_MIN_HEIGHT = 76;
const AGGREGATE_FIELD_HEIGHT = 20;
const READMODEL_HEIGHT = 74;
const SIMPLE_NODE_MIN_WIDTH = 150;
const SIMPLE_NODE_HEIGHT = 58;
// Dagre compound-cluster id for the subject context (only used when something sits outside it)
const BC_CLUSTER = '__d5_bounded_context';

const GRID_GAP = 60; // Slightly larger for better graph breathing room

const MARGIN = 30;
const TITLE_HEIGHT = 34;
const BC_PADDING = 30;
const BC_HEADER = 36;
const ARROW_MARKER_SIZE = 8;

// Ubiquitous Language sidebar (spec §7.3 — a sidebar, not inline clutter)
const NOTE_TEXT_W = 300;
const NOTE_PAD = 14;
const NOTE_WIDTH = NOTE_TEXT_W + NOTE_PAD * 2;
const NOTE_HEADER_H = 30;
const NOTE_TERM_GAP = 12;
const NOTE_TERM_FONT: FontSpec = { size: 12, weight: 600 };
const NOTE_DEF_FONT: FontSpec = { size: 11 };

const EVENT_STROKE = '#d97706'; // amber-600 — the Event Storming event colour
const POLICY_STROKE = '#7c3aed'; // violet-600 — the Event Storming policy colour
const POLICY_MAX_W = 172;
const COMMAND_STROKE = '#2563eb'; // blue-600 — the Event Storming command colour

type SimpleNodeKind = 'domain-service' | 'process' | 'neighbour' | 'actor';

const SIMPLE_NODE_STYLE: Record<
  SimpleNodeKind,
  { className: string; type: string; stroke: string; fill: string; text: string }
> = {
  'domain-service': {
    className: 'd5-domain-service',
    type: 'domain service',
    stroke: '#0d9488',
    fill: 'white',
    text: '#0f766e',
  },
  process: { className: 'd5-process', type: 'process', stroke: '#4f46e5', fill: 'white', text: '#4338ca' },
  neighbour: {
    className: 'd5-neighbour-context',
    type: 'bounded context',
    stroke: '#94a3b8',
    fill: '#f8fafc',
    text: '#64748b',
  },
  actor: { className: 'd5-actor', type: 'actor', stroke: '#ca8a04', fill: '#fef9c3', text: '#854d0e' },
};

function addArrowMarker(svg: SVGSVGElement, withCommand: boolean): void {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.prepend(defs);
  }
  for (const [id, fill] of [
    ['d5-arrowhead', '#64748b'],
    ['d5-event-arrowhead', EVENT_STROKE],
    ['d5-policy-arrowhead', POLICY_STROKE],
    ...(withCommand ? ([['d5-command-arrowhead', COMMAND_STROKE]] as const) : []),
  ] as const) {
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', id);
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
    path.setAttribute('fill', fill);
    marker.appendChild(path);
    defs.appendChild(marker);
  }
}

/** Event Storming "sticky": a right-pointed amber tag carrying the event name. */
function eventRibbon(cx: number, cy: number, name: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-event-label');
  const padX = 8;
  const point = 7;
  const w = Math.ceil(measureText(name, { size: 10, weight: 600 }) + padX * 2 + point);
  const h = 18;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const tag = document.createElementNS(SVG_NS, 'path');
  tag.setAttribute(
    'd',
    `M${x},${y} L${x + w - point},${y} L${x + w},${cy} L${x + w - point},${y + h} L${x},${y + h} Z`,
  );
  tag.setAttribute('fill', '#fef3c7');
  tag.setAttribute('stroke', EVENT_STROKE);
  tag.setAttribute('stroke-width', '1');
  g.appendChild(tag);
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(x + (w - point) / 2));
  t.setAttribute('y', String(cy + 3.5));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', '10');
  t.setAttribute('font-weight', '600');
  t.setAttribute('fill', '#92400e');
  t.textContent = name;
  g.appendChild(t);
  return g;
}

/** Event Storming command "sticky": a blue tag carrying the command name. */
function commandTag(cx: number, cy: number, name: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-command-label');
  const { w } = commandTagSize(name);
  const h = 18;
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(cx - w / 2));
  rect.setAttribute('y', String(cy - h / 2));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('rx', '2');
  rect.setAttribute('fill', '#dbeafe');
  rect.setAttribute('stroke', COMMAND_STROKE);
  rect.setAttribute('stroke-width', '1');
  g.appendChild(rect);
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(cx));
  t.setAttribute('y', String(cy + 3.5));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', '10');
  t.setAttribute('font-weight', '600');
  t.setAttribute('fill', '#1e40af');
  t.textContent = name;
  g.appendChild(t);
  return g;
}

function commandTagSize(name: string): { w: number; h: number } {
  return { w: Math.ceil(measureText(name, { size: 10, weight: 600 }) + 16), h: 20 };
}

function eventRibbonSize(name: string): { w: number; h: number } {
  return { w: Math.ceil(measureText(name, { size: 10, weight: 600 }) + 23), h: 20 };
}

const POLICY_FONT: FontSpec = { size: 10, weight: 600 };
const POLICY_PAD_X = 9;
const POLICY_PAD_Y = 4;

function policyLayout(rule: string): { lines: string[]; w: number; h: number } {
  const lines = wrapText(rule, POLICY_MAX_W - POLICY_PAD_X * 2, POLICY_FONT);
  const textW = lines.reduce((m, l) => Math.max(m, measureText(l, POLICY_FONT)), 1);
  return {
    lines,
    w: Math.ceil(textW + POLICY_PAD_X * 2),
    h: Math.ceil(lines.length * lineHeight(POLICY_FONT.size) + POLICY_PAD_Y * 2),
  };
}

/** A violet "whenever … then …" reaction tag. */
function policyTag(cx: number, cy: number, rule: string): SVGGElement {
  const { lines, w, h } = policyLayout(rule);
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-policy-label');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(cx - w / 2));
  rect.setAttribute('y', String(cy - h / 2));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', '#ede9fe');
  rect.setAttribute('stroke', POLICY_STROKE);
  rect.setAttribute('stroke-width', '1');
  g.appendChild(rect);

  const lh = lineHeight(POLICY_FONT.size);
  let ty = cy - h / 2 + POLICY_PAD_Y + POLICY_FONT.size * 0.82;
  for (const ln of lines) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', String(cx));
    t.setAttribute('y', String(ty));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', String(POLICY_FONT.size));
    t.setAttribute('font-weight', '600');
    t.setAttribute('fill', '#5b21b6');
    t.textContent = ln;
    g.appendChild(t);
    ty += lh;
  }
  return g;
}

function simpleNodeWidth(label: string): number {
  return Math.round(
    Math.min(
      AGGREGATE_MAX_WIDTH,
      Math.max(SIMPLE_NODE_MIN_WIDTH, measureText(label, { size: 13, weight: 600 }) + 44),
    ),
  );
}

/** The single-box nodes: a label over an italic type line, told apart by outline. */
function simpleNode(
  kind: SimpleNodeKind,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
): SVGGElement {
  const style = SIMPLE_NODE_STYLE[kind];
  const cx = x + w / 2;
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', style.className);

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  // a domain service is a stadium, the rest are boxes
  rect.setAttribute('rx', String(kind === 'domain-service' ? h / 2 : kind === 'neighbour' ? 10 : 4));
  rect.setAttribute('fill', style.fill);
  rect.setAttribute('stroke', style.stroke);
  rect.setAttribute('stroke-width', kind === 'actor' ? '1.5' : '2');
  if (kind === 'neighbour') rect.setAttribute('stroke-dasharray', '6 4');
  group.appendChild(rect);

  if (kind === 'process') {
    // the flowchart "predefined process" side bars
    for (const bx of [x + 8, x + w - 8]) {
      const bar = document.createElementNS(SVG_NS, 'line');
      bar.setAttribute('x1', String(bx));
      bar.setAttribute('y1', String(y));
      bar.setAttribute('x2', String(bx));
      bar.setAttribute('y2', String(y + h));
      bar.setAttribute('stroke', style.stroke);
      bar.setAttribute('stroke-width', '1.5');
      group.appendChild(bar);
    }
  }

  const labelText = document.createElementNS(SVG_NS, 'text');
  labelText.setAttribute('x', String(cx));
  labelText.setAttribute('y', String(y + 25));
  labelText.setAttribute('text-anchor', 'middle');
  labelText.setAttribute('font-size', '13');
  labelText.setAttribute('font-weight', 'bold');
  labelText.setAttribute('fill', '#1e293b');
  labelText.textContent = label;
  group.appendChild(labelText);

  const typeText = document.createElementNS(SVG_NS, 'text');
  typeText.setAttribute('x', String(cx));
  typeText.setAttribute('y', String(y + 42));
  typeText.setAttribute('text-anchor', 'middle');
  typeText.setAttribute('font-size', '10');
  typeText.setAttribute('font-style', 'italic');
  typeText.setAttribute('fill', style.text);
  typeText.textContent = style.type;
  group.appendChild(typeText);

  return group;
}

export function render(db: D5ContextReadable, container: SVGSVGElement): void {
  addArrowMarker(container, db.getCommands().length > 0);

  const title = db.getTitle();
  const bc = db.getBoundedContext();
  const aggregates = db.getAggregates();
  const terms = db.getTerms();
  const relationships = db.getRelationships();
  const events = db.getEvents();
  const policies = db.getPolicies();
  const readModels = db.getReadModels();
  const commands = db.getCommands();

  // Everything inside the boundary, and what sits outside it (neighbouring contexts, actors).
  const simpleInner = [
    ...db.getDomainServices().map((n) => ({ ...n, kind: 'domain-service' as const })),
    ...db.getProcesses().map((n) => ({ ...n, kind: 'process' as const })),
  ];
  const simpleOuter = [
    ...db.getNeighbours().map((n) => ({ ...n, kind: 'neighbour' as const })),
    ...db.getActors().map((n) => ({ ...n, kind: 'actor' as const })),
  ];
  const innerIds = new Set([...aggregates, ...readModels, ...simpleInner].map((n) => n.id));
  // A compound graph keeps the outside nodes out of the context's box; with nothing outside
  // there is no box to keep clear of and the plain graph is laid out as it always was.
  const compound = simpleOuter.length > 0 && innerIds.size > 0;

  // Create Dagre Layout. Aggregate flow is author-controlled via `direction` (default TB).
  // multigraph: several `Event`s (and a `Rel`) may connect the same pair of aggregates.
  const direction = db.getDirection();
  const g = new dagre.graphlib.Graph({ multigraph: true, compound });
  g.setGraph({
    rankdir: direction,
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
    const candidates = [
      measureText(agg.label, { size: 13, weight: 600 }) + 28,
      measureText(`Root: ${agg.root}`, { size: 11 }) + 28,
      ...(agg.fields ?? []).map((f) => measureText(f, { size: 12 }) + 44),
    ];
    const w = Math.round(
      Math.min(AGGREGATE_MAX_WIDTH, Math.max(AGGREGATE_MIN_WIDTH, ...candidates)),
    );
    g.setNode(agg.id, { width: w, height: h });
  });

  readModels.forEach((rm) => {
    const w = Math.round(
      Math.min(
        AGGREGATE_MAX_WIDTH,
        Math.max(AGGREGATE_MIN_WIDTH, measureText(rm.label, { size: 13, weight: 600 }) + 28),
      ),
    );
    g.setNode(rm.id, { width: w, height: READMODEL_HEIGHT });
  });

  [...simpleInner, ...simpleOuter].forEach((n) => {
    g.setNode(n.id, { width: simpleNodeWidth(n.label), height: SIMPLE_NODE_HEIGHT });
  });

  if (compound) {
    g.setNode(BC_CLUSTER, {});
    innerIds.forEach((id) => g.setParent(id, BC_CLUSTER));
  }

  relationships.forEach((rel) => {
    const edgeCfg: Record<string, unknown> = { minlen: 1 };
    if (rel.label) {
      const { w, h } = edgeLabelSize(rel.label, REL_LABEL_MAX_WIDTH);
      edgeCfg.width = w;
      edgeCfg.height = h;
      edgeCfg.labelpos = 'c';
    }
    g.setEdge(rel.source, rel.target, edgeCfg);
  });

  // Domain events are parallel named edges so they can coexist with a structural Rel.
  events.forEach((ev, i) => {
    const { w, h } = eventRibbonSize(ev.name);
    g.setEdge(ev.source, ev.target, { minlen: 1, width: w, height: h, labelpos: 'c' }, `evt${i}`);
  });

  // Reactive policies are likewise parallel named edges.
  policies.forEach((p, i) => {
    const { w, h } = policyLayout(p.rule);
    g.setEdge(p.source, p.target, { minlen: 1, width: w, height: h, labelpos: 'c' }, `pol${i}`);
  });

  // Commands too — the same pair may exchange several.
  commands.forEach((c, i) => {
    const { w, h } = commandTagSize(c.name);
    g.setEdge(c.source, c.target, { minlen: 1, width: w, height: h, labelpos: 'c' }, `cmd${i}`);
  });

  // Calculate coordinates
  dagre.layout(g);

  // Compute graph bounds 
  let graphW = finiteOr0(g.graph().width);
  let graphH = finiteOr0(g.graph().height);

  // The part of the layout the context's box wraps: all of it, unless something sits outside.
  let inner: Rect = { x0: 0, y0: 0, x1: graphW, y1: graphH };
  if (compound) {
    inner = innerBounds(g, innerIds) ?? inner;
  } else if (simpleOuter.length > 0) {
    // nothing inside to wrap: an empty box below the outside nodes
    inner = { x0: 0, y0: graphH + GRID_GAP, x1: 0, y1: graphH + GRID_GAP };
  }
  const innerW = inner.x1 - inner.x0;
  const innerH = inner.y1 - inner.y0;

  const hasTerms = terms.length > 0;

  // Wrap every term so the sidebar height is real, not guessed.
  const termBlocks = terms.map((t) => ({
    nameLines: wrapText(`${t.term}`, NOTE_TEXT_W, NOTE_TERM_FONT),
    defLines: wrapText(t.definition, NOTE_TEXT_W, NOTE_DEF_FONT),
  }));
  let noteH = 0;
  if (hasTerms) {
    noteH = NOTE_HEADER_H + NOTE_PAD;
    for (const b of termBlocks) {
      noteH +=
        b.nameLines.length * lineHeight(NOTE_TERM_FONT.size) +
        2 +
        b.defLines.length * lineHeight(NOTE_DEF_FONT.size) +
        NOTE_TERM_GAP;
    }
    noteH += NOTE_PAD - NOTE_TERM_GAP;
  }

  const noteSpace = hasTerms ? (innerW > 0 ? GRID_GAP : 0) + NOTE_WIDTH : 0;
  const innerGridW = innerW + noteSpace;
  const innerGridH = Math.max(innerH, noteH);
  // Centre the aggregate grid against the sidebar when the sidebar is the taller side.
  const gridYOffset = Math.max(0, (innerGridH - innerH) / 2);

  const originY = MARGIN + (title ? TITLE_HEIGHT : 0);
  let bcX = MARGIN + inner.x0;
  const bcY = originY + inner.y0;
  let bcW = innerGridW + BC_PADDING * 2;
  if (!bc && !hasTerms && innerIds.size === 0) bcW = 400; // fallback
  const bcH = (bc ? BC_HEADER : 0) + innerGridH + BC_PADDING * 2;

  const totalW = Math.max(bcX + bcW, MARGIN + graphW + BC_PADDING * 2 + noteSpace) + MARGIN;
  const totalH =
    Math.max(bcY + bcH, originY + graphH + (bc ? BC_HEADER : 0) + BC_PADDING * 2 + (innerGridH - innerH)) +
    MARGIN;

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

  // Layout → SVG coordinates: the box's header, padding and sidebar are opened up around
  // the inner rect, pushing anything outside the context away from it.
  const X = stretchAxis(inner.x0, inner.x1, MARGIN, MARGIN + BC_PADDING, BC_PADDING + noteSpace);
  const Y = stretchAxis(
    inner.y0,
    inner.y1,
    originY,
    originY + (bc ? BC_HEADER : 0) + BC_PADDING + gridYOffset,
    BC_PADDING + (innerGridH - innerH - gridYOffset),
  );

  // Draw the Ubiquitous Language sidebar
  if (hasTerms) {
    const noteX = graphStartX + (innerW > 0 ? innerW + GRID_GAP : 0);
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
      `M${noteX},${noteY + NOTE_HEADER_H} L${noteX},${noteY + 4} Q${noteX},${noteY} ${noteX + 4},${noteY} L${noteX + NOTE_WIDTH - 4},${noteY} Q${noteX + NOTE_WIDTH},${noteY} ${noteX + NOTE_WIDTH},${noteY + 4} L${noteX + NOTE_WIDTH},${noteY + NOTE_HEADER_H} Z`,
    );
    noteTop.setAttribute('fill', '#fde047');
    noteGroup.appendChild(noteTop);

    const noteTitle = document.createElementNS(SVG_NS, 'text');
    noteTitle.setAttribute('x', String(noteX + NOTE_WIDTH / 2));
    noteTitle.setAttribute('y', String(noteY + 20));
    noteTitle.setAttribute('text-anchor', 'middle');
    noteTitle.setAttribute('font-size', '12');
    noteTitle.setAttribute('font-weight', 'bold');
    noteTitle.setAttribute('fill', '#854d0e');
    noteTitle.textContent = 'Ubiquitous Language';
    noteGroup.appendChild(noteTitle);

    const textX = noteX + NOTE_PAD;
    let ty = noteY + NOTE_HEADER_H + NOTE_PAD + NOTE_TERM_FONT.size * 0.85;
    const nameLH = lineHeight(NOTE_TERM_FONT.size);
    const defLH = lineHeight(NOTE_DEF_FONT.size);

    termBlocks.forEach((block) => {
      block.nameLines.forEach((ln, i) => {
        const el = document.createElementNS(SVG_NS, 'text');
        el.setAttribute('x', String(textX));
        el.setAttribute('y', String(ty));
        el.setAttribute('font-size', String(NOTE_TERM_FONT.size));
        el.setAttribute('font-weight', 'bold');
        el.setAttribute('fill', '#713f12');
        el.textContent = i === block.nameLines.length - 1 ? `${ln}:` : ln;
        noteGroup.appendChild(el);
        ty += nameLH;
      });
      ty += 2;
      block.defLines.forEach((ln) => {
        const el = document.createElementNS(SVG_NS, 'text');
        el.setAttribute('x', String(textX));
        el.setAttribute('y', String(ty));
        el.setAttribute('font-size', String(NOTE_DEF_FONT.size));
        el.setAttribute('fill', '#854d0e');
        el.textContent = ln;
        noteGroup.appendChild(el);
        ty += defLH;
      });
      ty += NOTE_TERM_GAP;
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
    const x = X(node.x) - w / 2;
    const y = Y(node.y) - h / 2;
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

  // Draw read models — a distinct "table/projection" shape, no aggregate root.
  readModels.forEach((rm) => {
    const node = g.node(rm.id);
    if (!node) return;
    const w = node.width;
    const h = node.height;
    const x = X(node.x) - w / 2;
    const y = Y(node.y) - h / 2;
    const cx = x + w / 2;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-read-model');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '6');
    rect.setAttribute('fill', 'white');
    rect.setAttribute('stroke', '#64748b');
    rect.setAttribute('stroke-width', '2');
    group.appendChild(rect);

    const headerH = 30;
    const header = document.createElementNS(SVG_NS, 'path');
    header.setAttribute(
      'd',
      `M${x},${y + headerH} L${x},${y + 6} Q${x},${y} ${x + 6},${y} L${x + w - 6},${y} Q${x + w},${y} ${x + w},${y + 6} L${x + w},${y + headerH} Z`,
    );
    header.setAttribute('fill', '#f1f5f9');
    group.appendChild(header);

    const hLine = document.createElementNS(SVG_NS, 'line');
    hLine.setAttribute('x1', String(x));
    hLine.setAttribute('y1', String(y + headerH));
    hLine.setAttribute('x2', String(x + w));
    hLine.setAttribute('y2', String(y + headerH));
    hLine.setAttribute('stroke', '#64748b');
    hLine.setAttribute('stroke-width', '1');
    group.appendChild(hLine);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(cx));
    labelText.setAttribute('y', String(y + 19));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '13');
    labelText.setAttribute('font-weight', 'bold');
    labelText.setAttribute('fill', '#1e293b');
    labelText.textContent = rm.label;
    group.appendChild(labelText);

    const typeText = document.createElementNS(SVG_NS, 'text');
    typeText.setAttribute('x', String(cx));
    typeText.setAttribute('y', String(y + headerH + 16));
    typeText.setAttribute('text-anchor', 'middle');
    typeText.setAttribute('font-size', '10');
    typeText.setAttribute('font-style', 'italic');
    typeText.setAttribute('fill', '#64748b');
    typeText.textContent = 'read model';
    group.appendChild(typeText);

    // suggestion of tabular rows
    for (let r = 0; r < 2; r++) {
      const row = document.createElementNS(SVG_NS, 'line');
      row.setAttribute('x1', String(x + 12));
      row.setAttribute('y1', String(y + headerH + 30 + r * 9));
      row.setAttribute('x2', String(x + w - 12));
      row.setAttribute('y2', String(y + headerH + 30 + r * 9));
      row.setAttribute('stroke', '#e2e8f0');
      row.setAttribute('stroke-width', '1');
      group.appendChild(row);
    }

    container.appendChild(group);
  });

  // Draw domain services, processes, and the neighbours / actors outside the boundary.
  [...simpleInner, ...simpleOuter].forEach((n) => {
    const node = g.node(n.id);
    if (!node) return;
    const w = node.width;
    const h = node.height;
    container.appendChild(simpleNode(n.kind, n.label, X(node.x) - w / 2, Y(node.y) - h / 2, w, h));
  });

  // Draw Relationships using Dagre's beautifully computed edge points
  relationships.forEach((rel) => {
    const edge = g.edge(rel.source, rel.target);
    if (!edge || !edge.points || edge.points.length === 0) return;

    // Shift points to relative coordinate space
    const shiftedPoints = edge.points.map((p: { x: number; y: number }) => ({
      x: X(p.x),
      y: Y(p.y)
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
      let lx: number;
      let ly: number;
      if (typeof edge.x === 'number' && typeof edge.y === 'number') {
        lx = X(edge.x);
        ly = Y(edge.y);
      } else {
        const mid = shiftedPoints[Math.floor(shiftedPoints.length / 2)];
        lx = mid.x;
        ly = mid.y;
      }
      group.appendChild(
        createEdgeLabel({ x: lx, y: ly, text: rel.label, maxWidth: REL_LABEL_MAX_WIDTH }),
      );
    }

    container.appendChild(group);
  });

  // Draw domain events — dashed amber arrows carrying an Event Storming tag.
  events.forEach((ev, i) => {
    const edge = g.edge(ev.source, ev.target, `evt${i}`);
    if (!edge || !edge.points || edge.points.length === 0) return;

    const shiftedPoints = edge.points.map((p: { x: number; y: number }) => ({
      x: X(p.x),
      y: Y(p.y),
    }));

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-event');
    const titleEl = document.createElementNS(SVG_NS, 'title');
    titleEl.textContent = `${ev.name} — emitted by ${ev.source}, handled by ${ev.target}`;
    group.appendChild(titleEl);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', generateCurvePath(shiftedPoints));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', EVENT_STROKE);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-dasharray', '6 4');
    path.setAttribute('marker-end', 'url(#d5-event-arrowhead)');
    group.appendChild(path);

    let lx: number;
    let ly: number;
    if (typeof edge.x === 'number' && typeof edge.y === 'number') {
      lx = X(edge.x);
      ly = Y(edge.y);
    } else {
      const mid = shiftedPoints[Math.floor(shiftedPoints.length / 2)];
      lx = mid.x;
      ly = mid.y;
    }
    group.appendChild(eventRibbon(lx, ly, ev.name));

    container.appendChild(group);
  });

  // Draw reactive policies — violet dashed arrows with a "whenever … then …" tag.
  policies.forEach((p, i) => {
    const edge = g.edge(p.source, p.target, `pol${i}`);
    if (!edge || !edge.points || edge.points.length === 0) return;

    const shiftedPoints = edge.points.map((pt: { x: number; y: number }) => ({
      x: X(pt.x),
      y: Y(pt.y),
    }));

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-policy');
    const titleEl = document.createElementNS(SVG_NS, 'title');
    titleEl.textContent = `Policy — triggered via ${p.source}, acts on ${p.target}`;
    group.appendChild(titleEl);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', generateCurvePath(shiftedPoints));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', POLICY_STROKE);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-dasharray', '3 3');
    path.setAttribute('marker-end', 'url(#d5-policy-arrowhead)');
    group.appendChild(path);

    let lx: number;
    let ly: number;
    if (typeof edge.x === 'number' && typeof edge.y === 'number') {
      lx = X(edge.x);
      ly = Y(edge.y);
    } else {
      const mid = shiftedPoints[Math.floor(shiftedPoints.length / 2)];
      lx = mid.x;
      ly = mid.y;
    }
    group.appendChild(policyTag(lx, ly, p.rule));

    container.appendChild(group);
  });

  // Draw commands — solid blue arrows carrying an Event Storming command tag.
  commands.forEach((c, i) => {
    const edge = g.edge(c.source, c.target, `cmd${i}`);
    if (!edge || !edge.points || edge.points.length === 0) return;

    const shiftedPoints = edge.points.map((pt: { x: number; y: number }) => ({
      x: X(pt.x),
      y: Y(pt.y),
    }));

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'd5-command');
    const titleEl = document.createElementNS(SVG_NS, 'title');
    titleEl.textContent = `${c.name} — issued by ${c.source}, handled by ${c.target}`;
    group.appendChild(titleEl);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', generateCurvePath(shiftedPoints));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', COMMAND_STROKE);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('marker-end', 'url(#d5-command-arrowhead)');
    group.appendChild(path);

    let lx: number;
    let ly: number;
    if (typeof edge.x === 'number' && typeof edge.y === 'number') {
      lx = X(edge.x);
      ly = Y(edge.y);
    } else {
      const mid = shiftedPoints[Math.floor(shiftedPoints.length / 2)];
      lx = mid.x;
      ly = mid.y;
    }
    group.appendChild(commandTag(lx, ly, c.name));

    container.appendChild(group);
  });
}
