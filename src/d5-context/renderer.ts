import type { D5ContextDb } from './db.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const AGGREGATE_WIDTH = 160;
const AGGREGATE_HEIGHT = 80;
const GRID_COLS = 3;
const GRID_PADDING = 20;
const TITLE_OFFSET_Y = 30;
const CONTENT_OFFSET_Y = 60;

export function render(db: D5ContextDb, container: SVGSVGElement): void {
  const title = db.getTitle();
  if (title) {
    const titleEl = document.createElementNS(SVG_NS, 'text');
    titleEl.setAttribute('class', 'd5-title');
    titleEl.setAttribute('x', '20');
    titleEl.setAttribute('y', String(TITLE_OFFSET_Y));
    titleEl.textContent = title;
    container.appendChild(titleEl);
  }

  const bc = db.getBoundedContext();
  if (bc) {
    const bcGroup = document.createElementNS(SVG_NS, 'g');
    bcGroup.setAttribute('class', 'd5-bounded-context');

    const bcLabel = document.createElementNS(SVG_NS, 'text');
    bcLabel.setAttribute('x', '20');
    bcLabel.setAttribute('y', String(CONTENT_OFFSET_Y));
    bcLabel.textContent = bc.label;
    bcGroup.appendChild(bcLabel);

    container.appendChild(bcGroup);
  }

  const aggregates = db.getAggregates();
  const aggregateCenters = new Map<string, { cx: number; cy: number }>();

  aggregates.forEach((agg, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = GRID_PADDING + col * (AGGREGATE_WIDTH + GRID_PADDING);
    const y = CONTENT_OFFSET_Y + GRID_PADDING + row * (AGGREGATE_HEIGHT + GRID_PADDING);
    const cx = x + AGGREGATE_WIDTH / 2;
    const cy = y + AGGREGATE_HEIGHT / 2;

    aggregateCenters.set(agg.id, { cx, cy });

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'd5-aggregate');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(AGGREGATE_WIDTH));
    rect.setAttribute('height', String(AGGREGATE_HEIGHT));
    g.appendChild(rect);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(cx));
    labelText.setAttribute('y', String(cy));
    labelText.textContent = agg.label;
    g.appendChild(labelText);

    const rootText = document.createElementNS(SVG_NS, 'text');
    rootText.setAttribute('x', String(cx));
    rootText.setAttribute('y', String(cy + 16));
    rootText.textContent = agg.root;
    g.appendChild(rootText);

    container.appendChild(g);
  });

  const relationships = db.getRelationships();
  relationships.forEach((rel) => {
    const src = aggregateCenters.get(rel.source);
    const tgt = aggregateCenters.get(rel.target);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'd5-rel');

    if (src && tgt) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(src.cx));
      line.setAttribute('y1', String(src.cy));
      line.setAttribute('x2', String(tgt.cx));
      line.setAttribute('y2', String(tgt.cy));
      g.appendChild(line);

      const labelText = document.createElementNS(SVG_NS, 'text');
      labelText.setAttribute('x', String((src.cx + tgt.cx) / 2));
      labelText.setAttribute('y', String((src.cy + tgt.cy) / 2));
      labelText.textContent = rel.label;
      g.appendChild(labelText);
    } else {
      const labelText = document.createElementNS(SVG_NS, 'text');
      labelText.textContent = rel.label;
      g.appendChild(labelText);
    }

    container.appendChild(g);
  });
}
