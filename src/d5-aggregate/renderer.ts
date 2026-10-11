import type { D5AggregateReadable, Invariant, Multiplicity } from './db.js';
import dagre from '@dagrejs/dagre';
import { measureText, wrapText, lineHeight, type FontSpec } from '../shared/text.js';
import { finiteOr0, gridDimensions } from '../shared/shape.js';
import { createEdgeLabel, edgeLabelSize } from '../shared/edge-label.js';
import { generateCurvePath } from '../shared/curve.js';
import { innerBounds, stretchAxis, type Rect } from '../shared/boundary.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const MARGIN = 30;
const TITLE_HEIGHT = 40;
const AGG_PADDING = 28;
const AGG_HEADER = 36;
const LEGEND_H = 30;

// Root card (full-width head of the aggregate)
const ROOT_H = 58;
const ROOT_MIN_W = 320;

// Member grid
const CELL_MIN_W = 150;
const CELL_MAX_W = 240;
const CELL_GAP = 18;
const CELL_PAD_X = 16;
const CELL_PAD_Y = 9;
const LABEL_FONT: FontSpec = { size: 13, weight: 600 };
const TYPE_FONT_SIZE = 10;
const TARGET_GRID_W = 980;
const ROOT_TO_GRID_GAP = 24;

// Invariants band (rendered inside the aggregate boundary, below the object grid)
const INV_FONT = 12;
const INV_TITLE_FONT = 12;
const INV_PAD = 16;
const INV_BULLET_INDENT = 16;
const INV_GAP_ABOVE = 22;
const INV_TITLE_GAP = 12;
const INV_ITEM_GAP = 9;
const INV_BAND_BOTTOM_PAD = 12;
const INV_MAX_TEXT_COL = 620; // keep invariant prose in a readable column even on a wide grid

// Behaviour / Lifecycle bands share the Invariants band's chrome; their body (tags, states)
// starts this far below the band's top.
const BAND_BODY_TOP = INV_GAP_ABOVE + lineHeight(INV_TITLE_FONT) + 6;

// Behaviour band — the commands the aggregate handles and the events each one emits
const BEH_ROW_H = 18;
const BEH_ROW_GAP = 8;
const BEH_TAG_FONT: FontSpec = { size: 10, weight: 600 };
const BEH_ARROW_W = 26;
const BEH_TAG_GAP = 8;
const EVENT_POINT = 7;
const COMMAND_STROKE = '#2563eb'; // blue-600 — the Event Storming command colour
const EVENT_STROKE = '#d97706'; // amber-600 — the Event Storming event colour

// Lifecycle band — the aggregate's states and the transitions between them
const STATE_H = 26;
const STATE_FONT: FontSpec = { size: 11, weight: 600 };
const STATE_STROKE = '#475569';
const LIFECYCLE_INITIAL_W = 22; // room for the initial-state dot ahead of the graph

// Object graph (used once the diagram states ownership / references explicitly)
const GRAPH_ROOT_MIN_W = 200;
const GRAPH_MIN_CONTENT_W = 320;
const NEIGHBOUR_MIN_W = 150;
const NEIGHBOUR_H = 50;
const HAS_STROKE = '#475569';
const REF_STROKE = '#94a3b8';
// Dagre compound-cluster id for the subject aggregate (only used when it references others)
const AGG_CLUSTER = '__d5_aggregate';

const MULTIPLICITY_SYMBOL: Record<Multiplicity, string> = {
  one: '1',
  optional: '0..1',
  many: '*',
  at_least_one: '1..*',
};

interface Member {
  id: string;
  label: string;
  kind: 'entity' | 'value-object';
  lines: string[];
}

/**
 * A titled section inside the aggregate boundary, stacked below the objects. `minWidth` is
 * what it needs across; `layout` is told the content width it actually gets and answers
 * with its height (the gap above it included); `draw` gets the band's horizontal extent.
 */
interface Band {
  minWidth: number;
  layout(contentW: number): number;
  draw(parent: SVGSVGElement, bandX: number, bandRight: number, top: number): void;
}

interface BandChrome {
  className: string;
  heading: string;
  fill: string;
  stroke: string;
  headingFill: string;
}

/** The dashed backing + heading every band shares. */
function bandChrome(
  chrome: BandChrome,
  bandX: number,
  bandRight: number,
  top: number,
  bandH: number,
): SVGGElement {
  const y = top + INV_GAP_ABOVE;
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', chrome.className);

  const backing = document.createElementNS(SVG_NS, 'rect');
  backing.setAttribute('x', String(bandX - 8));
  backing.setAttribute('y', String(y - 12));
  backing.setAttribute('width', String(bandRight - bandX + 16));
  backing.setAttribute('height', String(bandH - INV_GAP_ABOVE + 12));
  backing.setAttribute('rx', '6');
  backing.setAttribute('fill', chrome.fill);
  backing.setAttribute('stroke', chrome.stroke);
  backing.setAttribute('stroke-width', '1');
  backing.setAttribute('stroke-dasharray', '4 3');
  group.appendChild(backing);

  const heading = document.createElementNS(SVG_NS, 'text');
  heading.setAttribute('x', String(bandX));
  heading.setAttribute('y', String(y + INV_TITLE_FONT * 0.9));
  heading.setAttribute('font-size', String(INV_TITLE_FONT));
  heading.setAttribute('font-weight', 'bold');
  heading.setAttribute('fill', chrome.headingFill);
  heading.textContent = chrome.heading;
  group.appendChild(heading);

  return group;
}

function addMarker(
  svg: SVGSVGElement,
  id: string,
  w: number,
  h: number,
  refX: number,
  d: string,
  fill: string,
): void {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.prepend(defs);
  }
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', id);
  marker.setAttribute('markerUnits', 'userSpaceOnUse');
  marker.setAttribute('markerWidth', String(w));
  marker.setAttribute('markerHeight', String(h));
  marker.setAttribute('refX', String(refX));
  marker.setAttribute('refY', String(h / 2));
  marker.setAttribute('orient', 'auto');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fill);
  marker.appendChild(path);
  defs.appendChild(marker);
}

function addArrowhead(svg: SVGSVGElement, id: string, fill: string): void {
  addMarker(svg, id, 10, 10, 10, 'M0,0 L10,5 L0,10 Z', fill);
}

/** Width of a tag sized to its text; an event's carries a point on its right. */
function tagWidth(text: string, kind: 'command' | 'event'): number {
  return Math.ceil(measureText(text, BEH_TAG_FONT) + 16 + (kind === 'event' ? EVENT_POINT : 0));
}

/** An Event Storming sticky: a blue box for a command, a right-pointed amber one for an event. */
function tag(text: string, kind: 'command' | 'event', x: number, y: number): SVGGElement {
  const w = tagWidth(text, kind);
  const h = BEH_ROW_H;
  const point = kind === 'event' ? EVENT_POINT : 0;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', kind === 'command' ? 'd5-command-label' : 'd5-event-label');

  if (kind === 'command') {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '2');
    rect.setAttribute('fill', '#dbeafe');
    rect.setAttribute('stroke', COMMAND_STROKE);
    rect.setAttribute('stroke-width', '1');
    g.appendChild(rect);
  } else {
    const shape = document.createElementNS(SVG_NS, 'path');
    shape.setAttribute(
      'd',
      `M${x},${y} L${x + w - point},${y} L${x + w},${y + h / 2} L${x + w - point},${y + h} L${x},${y + h} Z`,
    );
    shape.setAttribute('fill', '#fef3c7');
    shape.setAttribute('stroke', EVENT_STROKE);
    shape.setAttribute('stroke-width', '1');
    g.appendChild(shape);
  }

  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(x + (w - point) / 2));
  t.setAttribute('y', String(y + h / 2 + 3.5));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', String(BEH_TAG_FONT.size));
  t.setAttribute('font-weight', '600');
  t.setAttribute('fill', kind === 'command' ? '#1e40af' : '#92400e');
  t.textContent = text;
  g.appendChild(t);
  return g;
}

/** Commands handled, each followed by the events handling it emits. */
function behaviourBand(db: D5AggregateReadable): Band | undefined {
  const commands = db.getCommands();
  const events = db.getEvents();
  if (commands.length === 0 && events.length === 0) return undefined;

  const eventLabel = new Map(events.map((e) => [e.id, e.label]));
  const emitted = new Set<string>();
  const rows: { command: string | undefined; events: string[] }[] = commands.map((c) => {
    const own = db
      .getEmits()
      .filter((em) => em.command === c.id && eventLabel.has(em.event))
      .map((em) => em.event);
    own.forEach((id) => emitted.add(id));
    return { command: c.label, events: own.map((id) => eventLabel.get(id)!) };
  });
  // events no command is said to emit still belong to the aggregate's contract
  const loose = events.filter((e) => !emitted.has(e.id)).map((e) => e.label);
  if (loose.length > 0) rows.push({ command: undefined, events: loose });

  const rowWidth = (row: (typeof rows)[number]): number => {
    const tags = row.events.reduce((sum, e) => sum + tagWidth(e, 'event') + BEH_TAG_GAP, 0);
    const lead = row.command
      ? tagWidth(row.command, 'command') + (row.events.length > 0 ? BEH_ARROW_W : 0)
      : 0;
    return lead + Math.max(0, tags - BEH_TAG_GAP);
  };
  const bandH =
    BAND_BODY_TOP + rows.length * BEH_ROW_H + (rows.length - 1) * BEH_ROW_GAP + INV_BAND_BOTTOM_PAD;

  return {
    minWidth: Math.max(...rows.map(rowWidth)),
    layout: () => bandH,
    draw(parent, bandX, bandRight, top) {
      const group = bandChrome(
        {
          className: 'd5-behaviour',
          heading: 'Behaviour — commands handled → events emitted',
          fill: '#eff6ff',
          stroke: '#93c5fd',
          headingFill: '#1e40af',
        },
        bandX,
        bandRight,
        top,
        bandH,
      );

      let y = top + BAND_BODY_TOP;
      for (const row of rows) {
        let x = bandX;
        if (row.command) {
          group.appendChild(tag(row.command, 'command', x, y));
          x += tagWidth(row.command, 'command');
          if (row.events.length > 0) {
            const cy = y + BEH_ROW_H / 2;
            const tip = x + BEH_ARROW_W - 4;
            const arrow = document.createElementNS(SVG_NS, 'path');
            arrow.setAttribute(
              'd',
              `M${x + 4},${cy} L${tip},${cy} M${tip - 5},${cy - 4} L${tip},${cy} L${tip - 5},${cy + 4}`,
            );
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('stroke', '#64748b');
            arrow.setAttribute('stroke-width', '1.5');
            group.appendChild(arrow);
            x += BEH_ARROW_W;
          }
        }
        for (const e of row.events) {
          group.appendChild(tag(e, 'event', x, y));
          x += tagWidth(e, 'event') + BEH_TAG_GAP;
        }
        y += BEH_ROW_H + BEH_ROW_GAP;
      }
      parent.appendChild(group);
    },
  };
}

/** The aggregate's states, left to right, with the command behind each transition. */
function lifecycleBand(db: D5AggregateReadable): Band | undefined {
  const states = db.getStates();
  if (states.length === 0) return undefined;

  const stateIds = new Set(states.map((s) => s.id));
  const commandLabel = new Map(db.getCommands().map((c) => [c.id, c.label]));
  const transitions = db
    .getTransitions()
    .filter((t) => stateIds.has(t.from) && stateIds.has(t.to))
    .map((t) => ({ ...t, label: t.on ? commandLabel.get(t.on) : undefined }));

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: 'LR', nodesep: 14, ranksep: 34, edgesep: 14, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  states.forEach((s) => {
    g.setNode(s.id, { width: Math.ceil(measureText(s.label, STATE_FONT) + 26), height: STATE_H });
  });
  transitions.forEach((t, i) => {
    const cfg: Record<string, unknown> = { minlen: 1 };
    if (t.label) {
      const { w, h } = edgeLabelSize(t.label);
      Object.assign(cfg, { width: w, height: h, labelpos: 'c' });
    }
    g.setEdge(t.from, t.to, cfg, `t${i}`);
  });
  dagre.layout(g);

  const graphW = finiteOr0(g.graph().width);
  const graphH = finiteOr0(g.graph().height);
  const bandH = BAND_BODY_TOP + graphH + INV_BAND_BOTTOM_PAD;
  // a state nothing leaves is terminal — but only once the diagram states any transition
  const left = new Set(transitions.map((t) => t.from));

  return {
    minWidth: LIFECYCLE_INITIAL_W + graphW,
    layout: () => bandH,
    draw(parent, bandX, bandRight, top) {
      addArrowhead(parent, 'd5-lifecycle-arrowhead', STATE_STROKE);
      const group = bandChrome(
        {
          className: 'd5-lifecycle',
          heading: 'Lifecycle',
          fill: '#f1f5f9',
          stroke: '#cbd5e1',
          headingFill: '#334155',
        },
        bandX,
        bandRight,
        top,
        bandH,
      );
      const ox = bandX + LIFECYCLE_INITIAL_W;
      const oy = top + BAND_BODY_TOP;

      transitions.forEach((t, i) => {
        const edge = g.edge(t.from, t.to, `t${i}`);
        if (!edge || !edge.points || edge.points.length === 0) return;
        const eg = document.createElementNS(SVG_NS, 'g');
        eg.setAttribute('class', 'd5-transition');
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute(
          'd',
          generateCurvePath(
            edge.points.map((p: { x: number; y: number }) => ({ x: ox + p.x, y: oy + p.y })),
          ),
        );
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', STATE_STROKE);
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('marker-end', 'url(#d5-lifecycle-arrowhead)');
        eg.appendChild(path);
        if (t.label && typeof edge.x === 'number' && typeof edge.y === 'number') {
          eg.appendChild(
            createEdgeLabel({ x: ox + edge.x, y: oy + edge.y, text: t.label, fill: '#1e40af' }),
          );
        }
        group.appendChild(eg);
      });

      states.forEach((s, i) => {
        const node = g.node(s.id);
        const x = ox + node.x - node.width / 2;
        const y = oy + node.y - node.height / 2;
        const cy = oy + node.y;
        const sg = document.createElementNS(SVG_NS, 'g');
        sg.setAttribute('class', i === 0 ? 'd5-state d5-state-initial' : 'd5-state');

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(node.width));
        rect.setAttribute('height', String(node.height));
        rect.setAttribute('rx', String(node.height / 2));
        rect.setAttribute('fill', 'white');
        rect.setAttribute('stroke', STATE_STROKE);
        rect.setAttribute('stroke-width', '1.5');
        sg.appendChild(rect);

        if (transitions.length > 0 && !left.has(s.id)) {
          // terminal state: a second, inner outline
          const innerRect = document.createElementNS(SVG_NS, 'rect');
          innerRect.setAttribute('x', String(x + 3));
          innerRect.setAttribute('y', String(y + 3));
          innerRect.setAttribute('width', String(node.width - 6));
          innerRect.setAttribute('height', String(node.height - 6));
          innerRect.setAttribute('rx', String((node.height - 6) / 2));
          innerRect.setAttribute('fill', 'none');
          innerRect.setAttribute('stroke', STATE_STROKE);
          innerRect.setAttribute('stroke-width', '1');
          sg.appendChild(innerRect);
        }

        if (i === 0) {
          // initial state: a dot leading into it
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.setAttribute('cx', String(x - LIFECYCLE_INITIAL_W + 5));
          dot.setAttribute('cy', String(cy));
          dot.setAttribute('r', '4');
          dot.setAttribute('fill', STATE_STROKE);
          sg.appendChild(dot);
          const lead = document.createElementNS(SVG_NS, 'line');
          lead.setAttribute('x1', String(x - LIFECYCLE_INITIAL_W + 9));
          lead.setAttribute('y1', String(cy));
          lead.setAttribute('x2', String(x));
          lead.setAttribute('y2', String(cy));
          lead.setAttribute('stroke', STATE_STROKE);
          lead.setAttribute('stroke-width', '1.5');
          sg.appendChild(lead);
        }

        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', String(ox + node.x));
        label.setAttribute('y', String(cy + 4));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', String(STATE_FONT.size));
        label.setAttribute('font-weight', '600');
        label.setAttribute('fill', '#1e293b');
        label.textContent = s.label;
        sg.appendChild(label);
        group.appendChild(sg);
      });

      parent.appendChild(group);
    },
  };
}

/** The business rules the aggregate keeps true, attributed to its root. */
function invariantsBand(invariants: Invariant[], root: string | undefined): Band | undefined {
  if (invariants.length === 0) return undefined;
  let itemLines: string[][] = [];
  let bandH = 0;

  return {
    minWidth: 0,
    // measure/wrap so the band can extend the aggregate box
    layout(contentW) {
      const wrapW = Math.min(contentW, INV_MAX_TEXT_COL) - INV_PAD * 2 - INV_BULLET_INDENT;
      itemLines = [];
      bandH = INV_GAP_ABOVE + lineHeight(INV_TITLE_FONT) + INV_TITLE_GAP;
      for (const inv of invariants) {
        const full = inv.name ? `${inv.name} — ${inv.text}` : inv.text;
        const lines = wrapText(full, wrapW, { size: INV_FONT });
        itemLines.push(lines);
        bandH += lines.length * lineHeight(INV_FONT) + INV_ITEM_GAP;
      }
      bandH += INV_BAND_BOTTOM_PAD - INV_ITEM_GAP;
      return bandH;
    },
    draw(parent, bandX, bandRight, top) {
      const invGroup = bandChrome(
        {
          className: 'd5-invariants',
          heading: root ? `Invariants — enforced by root: ${root}` : 'Invariants',
          fill: '#fffbeb',
          stroke: '#fcd34d',
          headingFill: '#92400e',
        },
        bandX,
        bandRight,
        top,
        bandH,
      );
      let y = top + INV_GAP_ABOVE;
      y += lineHeight(INV_TITLE_FONT) + INV_TITLE_GAP;

      const lh = lineHeight(INV_FONT);
      itemLines.forEach((lines) => {
        const ms = 6;
        const marker = document.createElementNS(SVG_NS, 'rect');
        marker.setAttribute('x', String(bandX + 1));
        marker.setAttribute('y', String(y - ms));
        marker.setAttribute('width', String(ms));
        marker.setAttribute('height', String(ms));
        marker.setAttribute('transform', `rotate(45 ${bandX + 1 + ms / 2} ${y - ms + ms / 2})`);
        marker.setAttribute('fill', '#f59e0b');
        invGroup.appendChild(marker);

        lines.forEach((ln, i) => {
          const t = document.createElementNS(SVG_NS, 'text');
          t.setAttribute('x', String(bandX + INV_BULLET_INDENT));
          t.setAttribute('y', String(y + i * lh));
          t.setAttribute('font-size', String(INV_FONT));
          t.setAttribute('fill', '#78350f');
          t.textContent = ln;
          invGroup.appendChild(t);
        });
        y += lines.length * lh + INV_ITEM_GAP;
      });

      parent.appendChild(invGroup);
    },
  };
}

function drawTitle(container: SVGSVGElement, title: string, totalW: number): void {
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

function drawBoundary(
  container: SVGSVGElement,
  label: string,
  aggX: number,
  aggY: number,
  aggW: number,
  aggH: number,
): void {
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
  aggLabel.textContent = `Aggregate: ${label}`;
  aggGroup.appendChild(aggLabel);

  container.appendChild(aggGroup);
}

function drawRoot(container: SVGSVGElement, root: string, x: number, y: number, w: number): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-entity d5-aggregate-root');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(ROOT_H));
  rect.setAttribute('rx', '8');
  rect.setAttribute('fill', '#eff6ff');
  rect.setAttribute('stroke', '#3b82f6');
  rect.setAttribute('stroke-width', '3');
  g.appendChild(rect);

  const cx = x + w / 2;
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', String(cx));
  label.setAttribute('y', String(y + 25));
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '15');
  label.setAttribute('font-weight', 'bold');
  label.setAttribute('fill', '#1e293b');
  label.textContent = root;
  g.appendChild(label);

  const type = document.createElementNS(SVG_NS, 'text');
  type.setAttribute('x', String(cx));
  type.setAttribute('y', String(y + 43));
  type.setAttribute('text-anchor', 'middle');
  type.setAttribute('font-size', String(TYPE_FONT_SIZE));
  type.setAttribute('font-style', 'italic');
  type.setAttribute('fill', '#3b82f6');
  type.textContent = 'Aggregate Root';
  g.appendChild(type);

  container.appendChild(g);
}

function drawMember(
  container: SVGSVGElement,
  m: Member,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
): void {
  const cx = x + cellW / 2;
  const isEntity = m.kind === 'entity';

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', isEntity ? 'd5-entity' : 'd5-value-object');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(cellW));
  rect.setAttribute('height', String(cellH));
  rect.setAttribute('rx', String(isEntity ? 6 : cellH / 2));
  rect.setAttribute('fill', 'white');
  rect.setAttribute('stroke', isEntity ? '#3b82f6' : '#10b981');
  rect.setAttribute('stroke-width', '2');
  g.appendChild(rect);

  const lh = lineHeight(LABEL_FONT.size);
  const blockH = m.lines.length * lh + 4 + TYPE_FONT_SIZE;
  let ty = y + (cellH - blockH) / 2 + LABEL_FONT.size * 0.85;
  m.lines.forEach((ln) => {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', String(cx));
    t.setAttribute('y', String(ty));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', String(LABEL_FONT.size));
    t.setAttribute('font-weight', '600');
    t.setAttribute('fill', '#1e293b');
    t.textContent = ln;
    g.appendChild(t);
    ty += lh;
  });

  const type = document.createElementNS(SVG_NS, 'text');
  type.setAttribute('x', String(cx));
  type.setAttribute('y', String(ty + 2));
  type.setAttribute('text-anchor', 'middle');
  type.setAttribute('font-size', String(TYPE_FONT_SIZE));
  type.setAttribute('font-style', 'italic');
  type.setAttribute('fill', isEntity ? '#3b82f6' : '#10b981');
  type.textContent = isEntity ? 'Entity' : 'Value Object';
  g.appendChild(type);

  container.appendChild(g);
}

/** Another aggregate, outside the boundary, that a member references by id. */
function drawNeighbour(
  container: SVGSVGElement,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'd5-aggregate-ref');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('rx', '10');
  rect.setAttribute('fill', '#f8fafc');
  rect.setAttribute('stroke', REF_STROKE);
  rect.setAttribute('stroke-width', '2');
  rect.setAttribute('stroke-dasharray', '6 4');
  g.appendChild(rect);

  const cx = x + w / 2;
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(cx));
  text.setAttribute('y', String(y + 22));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', String(LABEL_FONT.size));
  text.setAttribute('font-weight', '600');
  text.setAttribute('fill', '#1e293b');
  text.textContent = label;
  g.appendChild(text);

  const type = document.createElementNS(SVG_NS, 'text');
  type.setAttribute('x', String(cx));
  type.setAttribute('y', String(y + 38));
  type.setAttribute('text-anchor', 'middle');
  type.setAttribute('font-size', String(TYPE_FONT_SIZE));
  type.setAttribute('font-style', 'italic');
  type.setAttribute('fill', '#64748b');
  type.textContent = 'Aggregate';
  g.appendChild(type);

  container.appendChild(g);
}

type LegendItem =
  | { label: string; stroke: string; width: number; rx: number }
  | { label: string; stroke: string; dashed: boolean };

function drawLegend(
  container: SVGSVGElement,
  legendX: number,
  legendY: number,
  lines: LegendItem[],
): void {
  const legendGroup = document.createElementNS(SVG_NS, 'g');
  legendGroup.setAttribute('class', 'd5-legend');

  const legendItems: LegendItem[] = [
    { label: 'Aggregate Root', stroke: '#3b82f6', width: 3, rx: 3 },
    { label: 'Entity', stroke: '#3b82f6', width: 2, rx: 3 },
    { label: 'Value Object', stroke: '#10b981', width: 2, rx: 7 },
    ...lines,
  ];

  legendItems.forEach((item) => {
    if ('rx' in item) {
      const swatch = document.createElementNS(SVG_NS, 'rect');
      swatch.setAttribute('x', String(legendX));
      swatch.setAttribute('y', String(legendY));
      swatch.setAttribute('width', '14');
      swatch.setAttribute('height', '14');
      swatch.setAttribute('rx', String(item.rx));
      swatch.setAttribute('fill', 'white');
      swatch.setAttribute('stroke', item.stroke);
      swatch.setAttribute('stroke-width', String(item.width));
      legendGroup.appendChild(swatch);
    } else {
      const swatch = document.createElementNS(SVG_NS, 'line');
      swatch.setAttribute('x1', String(legendX - 3));
      swatch.setAttribute('y1', String(legendY + 7));
      swatch.setAttribute('x2', String(legendX + 17));
      swatch.setAttribute('y2', String(legendY + 7));
      swatch.setAttribute('stroke', item.stroke);
      swatch.setAttribute('stroke-width', '1.5');
      if (item.dashed) swatch.setAttribute('stroke-dasharray', '5 4');
      legendGroup.appendChild(swatch);
    }

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(legendX + 20));
    label.setAttribute('y', String(legendY + 11));
    label.setAttribute('font-size', '11');
    label.setAttribute('fill', '#64748b');
    label.textContent = item.label;
    legendGroup.appendChild(label);

    legendX += 26 + measureText(item.label, { size: 11 }) + 22;
  });

  container.appendChild(legendGroup);
}

function wrapMembers(db: D5AggregateReadable, rootId: string | undefined): Member[] {
  const wrapW = CELL_MAX_W - CELL_PAD_X * 2;
  return [
    ...db
      .getEntities()
      .filter((e) => e.id !== rootId)
      .map((e) => ({ ...e, kind: 'entity' as const })),
    ...db.getValueObjects().map((v) => ({ ...v, kind: 'value-object' as const })),
  ].map((m) => ({ ...m, lines: wrapText(m.label, wrapW, LABEL_FONT) }));
}

export function render(db: D5AggregateReadable, container: SVGSVGElement): void {
  const title = db.getTitle();
  const aggregate = db.getAggregate();
  const entities = db.getEntities();

  const rootId = aggregate ? entities.find((e) => e.label === aggregate.root)?.id : undefined;
  const members = wrapMembers(db, rootId);
  const bands = [
    behaviourBand(db),
    lifecycleBand(db),
    invariantsBand(db.getInvariants(), aggregate?.root),
  ].filter((b): b is Band => b !== undefined);

  // Ownership or references stated explicitly: draw the objects as a graph, not a grid.
  if (db.getHas().length > 0 || db.getRefs().length > 0) {
    renderGraph(db, container, rootId, members, bands);
    return;
  }

  // ---- Member grid: every cell is measured + wrapped, pick a uniform cell width ----
  const widestLabel = members.reduce(
    (max, m) => Math.max(max, ...m.lines.map((l) => measureText(l, LABEL_FONT))),
    0,
  );
  const cellW = Math.round(
    Math.min(CELL_MAX_W, Math.max(CELL_MIN_W, widestLabel + CELL_PAD_X * 2)),
  );
  const maxLines = members.reduce((max, m) => Math.max(max, m.lines.length), 1);
  const cellH = CELL_PAD_Y * 2 + maxLines * lineHeight(LABEL_FONT.size) + 4 + TYPE_FONT_SIZE;

  const { cols, rows } = gridDimensions(members.length, cellW, CELL_GAP, TARGET_GRID_W);
  const gridW = cols > 0 ? cols * cellW + (cols - 1) * CELL_GAP : 0;
  const gridH = rows > 0 ? rows * cellH + (rows - 1) * CELL_GAP : 0;

  // a band spans the boundary less INV_PAD a side — the content width plus this much
  const bandOverhang = (AGG_PADDING - INV_PAD) * 2;
  const contentW = Math.max(
    gridW,
    rootId ? ROOT_MIN_W : 0,
    320,
    ...bands.map((b) => b.minWidth - bandOverhang),
  );

  const bandHeights = bands.map((b) => b.layout(contentW));
  const bandsH = bandHeights.reduce((sum, h) => sum + h, 0);

  // ---- Overall geometry ----------------------------------------------------------
  const aggX = MARGIN;
  const aggY = MARGIN + (title ? TITLE_HEIGHT : 0);
  const aggW = contentW + AGG_PADDING * 2;

  const bodyTop = aggY + AGG_HEADER + AGG_PADDING;
  const rootBottom = rootId ? bodyTop + ROOT_H + ROOT_TO_GRID_GAP : bodyTop;
  const gridBottom = rootBottom + gridH;
  const aggH = gridBottom + bandsH + AGG_PADDING - aggY;

  const totalW = aggX + aggW + MARGIN;
  const totalH = aggY + aggH + LEGEND_H + MARGIN;

  container.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  container.setAttribute('height', String(totalH));
  container.style.maxWidth = `${totalW}px`;

  if (title) drawTitle(container, title, totalW);
  if (aggregate) drawBoundary(container, aggregate.label, aggX, aggY, aggW, aggH);

  const contentX = aggX + AGG_PADDING;
  if (rootId && aggregate) drawRoot(container, aggregate.root, contentX, bodyTop, contentW);

  const gridX = contentX + (contentW - gridW) / 2;
  members.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridX + col * (cellW + CELL_GAP);
    const y = rootBottom + row * (cellH + CELL_GAP);
    drawMember(container, m, x, y, cellW, cellH);
  });

  let bandTop = gridBottom;
  bands.forEach((band, i) => {
    band.draw(container, aggX + INV_PAD, aggX + aggW - INV_PAD, bandTop);
    bandTop += bandHeights[i];
  });

  drawLegend(container, aggX, aggY + aggH + 16, []);
}

/**
 * The objects as an ownership tree hanging from the root (`Has`), with the aggregates they
 * reference by id (`Ref`) drawn outside the boundary.
 */
function renderGraph(
  db: D5AggregateReadable,
  container: SVGSVGElement,
  rootId: string | undefined,
  members: Member[],
  bands: Band[],
): void {
  const title = db.getTitle();
  const aggregate = db.getAggregate();

  const memberIds = new Set(members.map((m) => m.id));
  if (rootId) memberIds.add(rootId);
  const has = db.getHas().filter((h) => memberIds.has(h.owner) && memberIds.has(h.part));
  const neighbours = db.getNeighbours();
  const neighbourIds = new Set(neighbours.map((n) => n.id));
  const refs = db.getRefs().filter((r) => memberIds.has(r.source) && neighbourIds.has(r.target));

  const compound = neighbours.length > 0 && memberIds.size > 0;
  const g = new dagre.graphlib.Graph({ multigraph: true, compound });
  g.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 46, edgesep: 20, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));

  if (rootId && aggregate) {
    const w = Math.round(
      Math.max(GRAPH_ROOT_MIN_W, measureText(aggregate.root, { size: 15, weight: 'bold' }) + 48),
    );
    g.setNode(rootId, { width: w, height: ROOT_H });
  }
  members.forEach((m) => {
    const widest = Math.max(...m.lines.map((l) => measureText(l, LABEL_FONT)));
    g.setNode(m.id, {
      width: Math.round(Math.min(CELL_MAX_W, Math.max(CELL_MIN_W, widest + CELL_PAD_X * 2))),
      height: CELL_PAD_Y * 2 + m.lines.length * lineHeight(LABEL_FONT.size) + 4 + TYPE_FONT_SIZE,
    });
  });
  neighbours.forEach((n) => {
    g.setNode(n.id, {
      width: Math.round(Math.max(NEIGHBOUR_MIN_W, measureText(n.label, LABEL_FONT) + 40)),
      height: NEIGHBOUR_H,
    });
  });
  if (compound) {
    g.setNode(AGG_CLUSTER, {});
    memberIds.forEach((id) => g.setParent(id, AGG_CLUSTER));
  }

  const edgeLabel = (e: { multiplicity: Multiplicity; role: string | undefined }): string =>
    e.role ? `${MULTIPLICITY_SYMBOL[e.multiplicity]} ${e.role}` : MULTIPLICITY_SYMBOL[e.multiplicity];
  const labelled = (text: string): Record<string, unknown> => {
    const { w, h } = edgeLabelSize(text);
    return { minlen: 1, width: w, height: h, labelpos: 'c' };
  };
  has.forEach((h, i) => g.setEdge(h.owner, h.part, labelled(edgeLabel(h)), `has${i}`));
  // Laid out target → source: the referenced aggregate is ranked above the member holding
  // the reference, so it lands beside (or above) the box and the line to it never has to
  // run down through the bands at the bottom of the boundary.
  refs.forEach((r, i) => g.setEdge(r.target, r.source, labelled(edgeLabel(r)), `ref${i}`));

  // A member nothing is said to own still sits inside the boundary, so it is the root's by
  // containment: rank it under the root, without drawing a line the author didn't state.
  if (rootId) {
    const owned = new Set(has.map((h) => h.part));
    members.forEach((m, i) => {
      if (!owned.has(m.id)) g.setEdge(rootId, m.id, { minlen: 1 }, `implicit${i}`);
    });
  }

  dagre.layout(g);

  const graphW = finiteOr0(g.graph().width);
  const graphH = finiteOr0(g.graph().height);
  const inner: Rect = (compound ? innerBounds(g, memberIds) : undefined) ?? {
    x0: 0,
    y0: 0,
    x1: graphW,
    y1: graphH,
  };
  const innerW = inner.x1 - inner.x0;
  const innerH = inner.y1 - inner.y0;

  const bandOverhang = (AGG_PADDING - INV_PAD) * 2;
  const contentW = Math.max(
    innerW,
    GRAPH_MIN_CONTENT_W,
    ...bands.map((b) => b.minWidth - bandOverhang),
  );
  const bandHeights = bands.map((b) => b.layout(contentW));
  const bandsH = bandHeights.reduce((sum, h) => sum + h, 0);

  // ---- Overall geometry: open the box's header, padding and bands up around the objects
  const extraW = contentW - innerW;
  const originY = MARGIN + (title ? TITLE_HEIGHT : 0);
  const X = stretchAxis(
    inner.x0,
    inner.x1,
    MARGIN,
    MARGIN + AGG_PADDING + extraW / 2,
    extraW / 2 + AGG_PADDING,
  );
  const Y = stretchAxis(
    inner.y0,
    inner.y1,
    originY,
    originY + AGG_HEADER + AGG_PADDING,
    bandsH + AGG_PADDING,
  );

  const aggX = MARGIN + inner.x0;
  const aggY = originY + inner.y0;
  const aggW = contentW + AGG_PADDING * 2;
  const aggH = AGG_HEADER + AGG_PADDING + innerH + bandsH + AGG_PADDING;

  const totalW = MARGIN + graphW + extraW + AGG_PADDING * 2 + MARGIN;
  const bottom = originY + graphH + AGG_HEADER + AGG_PADDING * 2 + bandsH;
  const totalH = bottom + LEGEND_H + MARGIN;

  container.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  container.setAttribute('height', String(totalH));
  container.style.maxWidth = `${totalW}px`;

  addMarker(container, 'd5-has-diamond', 14, 8, 0, 'M0,4 L7,0 L14,4 L7,8 Z', HAS_STROKE);
  if (refs.length > 0) addArrowhead(container, 'd5-ref-arrowhead', REF_STROKE);

  if (title) drawTitle(container, title, totalW);
  if (aggregate) drawBoundary(container, aggregate.label, aggX, aggY, aggW, aggH);

  // ---- Objects -------------------------------------------------------------------
  const box = (id: string): { x: number; y: number; w: number; h: number } => {
    const node = g.node(id);
    return {
      x: X(node.x) - node.width / 2,
      y: Y(node.y) - node.height / 2,
      w: node.width,
      h: node.height,
    };
  };
  if (rootId && aggregate) {
    const b = box(rootId);
    drawRoot(container, aggregate.root, b.x, b.y, b.w);
  }
  members.forEach((m) => {
    const b = box(m.id);
    drawMember(container, m, b.x, b.y, b.w, b.h);
  });
  neighbours.forEach((n) => {
    const b = box(n.id);
    drawNeighbour(container, n.label, b.x, b.y, b.w, b.h);
  });

  // ---- Ownership and references ---------------------------------------------------
  const drawEdge = (
    from: string,
    to: string,
    name: string,
    className: string,
    text: string,
    tooltip: string,
    style: (path: SVGPathElement) => void,
    reversed = false,
  ): void => {
    const edge = reversed ? g.edge(to, from, name) : g.edge(from, to, name);
    if (!edge || !edge.points || edge.points.length === 0) return;
    const points: { x: number; y: number }[] = reversed ? [...edge.points].reverse() : edge.points;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', className);
    const titleEl = document.createElementNS(SVG_NS, 'title');
    titleEl.textContent = tooltip;
    group.appendChild(titleEl);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      generateCurvePath(points.map((p) => ({ x: X(p.x), y: Y(p.y) }))),
    );
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '1.5');
    style(path);
    group.appendChild(path);

    if (typeof edge.x === 'number' && typeof edge.y === 'number') {
      group.appendChild(createEdgeLabel({ x: X(edge.x), y: Y(edge.y), text }));
    }
    container.appendChild(group);
  };

  has.forEach((h, i) => {
    drawEdge(h.owner, h.part, `has${i}`, 'd5-has', edgeLabel(h), `${h.owner} owns ${h.part}`, (path) => {
      path.setAttribute('stroke', HAS_STROKE);
      path.setAttribute('marker-start', 'url(#d5-has-diamond)');
    });
  });
  refs.forEach((r, i) => {
    drawEdge(
      r.source,
      r.target,
      `ref${i}`,
      'd5-ref',
      edgeLabel(r),
      `${r.source} references ${r.target} by id`,
      (path) => {
        path.setAttribute('stroke', REF_STROKE);
        path.setAttribute('stroke-dasharray', '5 4');
        path.setAttribute('marker-end', 'url(#d5-ref-arrowhead)');
      },
      true,
    );
  });

  // ---- Bands ----------------------------------------------------------------------
  let bandTop = aggY + AGG_HEADER + AGG_PADDING + innerH;
  bands.forEach((band, i) => {
    band.draw(container, aggX + INV_PAD, aggX + aggW - INV_PAD, bandTop);
    bandTop += bandHeights[i];
  });

  drawLegend(container, MARGIN, bottom + 16, [
    { label: 'owns', stroke: HAS_STROKE, dashed: false },
    ...(refs.length > 0 ? [{ label: 'references by id', stroke: REF_STROKE, dashed: true }] : []),
  ]);
}
