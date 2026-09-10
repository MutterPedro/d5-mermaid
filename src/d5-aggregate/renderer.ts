import type { D5AggregateDb } from './db.js';
import { measureText, wrapText, lineHeight, type FontSpec } from '../shared/text.js';
import { gridDimensions } from '../shared/shape.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const MARGIN = 30;
const TITLE_HEIGHT = 40;
const AGG_PADDING = 28;
const AGG_HEADER = 36;

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

interface Member {
  id: string;
  label: string;
  kind: 'entity' | 'value-object';
  lines: string[];
}

export function render(db: D5AggregateDb, container: SVGSVGElement): void {
  const title = db.getTitle();
  const aggregate = db.getAggregate();
  const entities = db.getEntities();
  const valueObjects = db.getValueObjects();
  const invariants = db.getInvariants();

  const rootId = aggregate ? entities.find((e) => e.label === aggregate.root)?.id : undefined;

  // ---- Member grid: measure + wrap every cell, pick a uniform cell width ----------
  const wrapW = CELL_MAX_W - CELL_PAD_X * 2;
  const members: Member[] = [
    ...entities.filter((e) => e.id !== rootId).map((e) => ({ ...e, kind: 'entity' as const })),
    ...valueObjects.map((v) => ({ ...v, kind: 'value-object' as const })),
  ].map((m) => ({ ...m, lines: wrapText(m.label, wrapW, LABEL_FONT) }));

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

  const contentW = Math.max(gridW, rootId ? ROOT_MIN_W : 0, 320);

  // ---- Invariants band: measure/wrap so it can extend the aggregate box ------------
  const invWrapW = Math.min(contentW, INV_MAX_TEXT_COL) - INV_PAD * 2 - INV_BULLET_INDENT;
  const invItemLines: string[][] = [];
  let invBandH = 0;
  if (invariants.length > 0) {
    invBandH = INV_GAP_ABOVE + lineHeight(INV_TITLE_FONT) + INV_TITLE_GAP;
    for (const inv of invariants) {
      const full = inv.name ? `${inv.name} — ${inv.text}` : inv.text;
      const lines = wrapText(full, invWrapW, { size: INV_FONT });
      invItemLines.push(lines);
      invBandH += lines.length * lineHeight(INV_FONT) + INV_ITEM_GAP;
    }
    invBandH += INV_BAND_BOTTOM_PAD - INV_ITEM_GAP;
  }

  // ---- Overall geometry ----------------------------------------------------------
  const aggX = MARGIN;
  const aggY = MARGIN + (title ? TITLE_HEIGHT : 0);
  const aggW = contentW + AGG_PADDING * 2;

  const bodyTop = aggY + AGG_HEADER + AGG_PADDING;
  const rootBottom = rootId ? bodyTop + ROOT_H + ROOT_TO_GRID_GAP : bodyTop;
  const gridBottom = rootBottom + gridH;
  const aggH = gridBottom + invBandH + AGG_PADDING - aggY;

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

  // ---- Aggregate boundary ------------------------------------------------------
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

  const contentX = aggX + AGG_PADDING;

  // ---- Root card ------------------------------------------------------------------
  if (rootId && aggregate) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'd5-entity d5-aggregate-root');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(contentX));
    rect.setAttribute('y', String(bodyTop));
    rect.setAttribute('width', String(contentW));
    rect.setAttribute('height', String(ROOT_H));
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', '#eff6ff');
    rect.setAttribute('stroke', '#3b82f6');
    rect.setAttribute('stroke-width', '3');
    g.appendChild(rect);

    const cx = contentX + contentW / 2;
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(cx));
    label.setAttribute('y', String(bodyTop + 25));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '15');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('fill', '#1e293b');
    label.textContent = aggregate.root;
    g.appendChild(label);

    const type = document.createElementNS(SVG_NS, 'text');
    type.setAttribute('x', String(cx));
    type.setAttribute('y', String(bodyTop + 43));
    type.setAttribute('text-anchor', 'middle');
    type.setAttribute('font-size', String(TYPE_FONT_SIZE));
    type.setAttribute('font-style', 'italic');
    type.setAttribute('fill', '#3b82f6');
    type.textContent = 'Aggregate Root';
    g.appendChild(type);

    container.appendChild(g);
  }

  // ---- Member grid -------------------------------------------------------------
  const gridX = contentX + (contentW - gridW) / 2;
  members.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridX + col * (cellW + CELL_GAP);
    const y = rootBottom + row * (cellH + CELL_GAP);
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
  });

  // ---- Invariants band ---------------------------------------------------------
  if (invariants.length > 0) {
    const bandX = aggX + INV_PAD;
    const bandRight = aggX + aggW - INV_PAD;
    let y = gridBottom + INV_GAP_ABOVE;

    const invGroup = document.createElementNS(SVG_NS, 'g');
    invGroup.setAttribute('class', 'd5-invariants');

    const backing = document.createElementNS(SVG_NS, 'rect');
    backing.setAttribute('x', String(bandX - 8));
    backing.setAttribute('y', String(y - 12));
    backing.setAttribute('width', String(bandRight - bandX + 16));
    backing.setAttribute('height', String(invBandH - INV_GAP_ABOVE + 12));
    backing.setAttribute('rx', '6');
    backing.setAttribute('fill', '#fffbeb');
    backing.setAttribute('stroke', '#fcd34d');
    backing.setAttribute('stroke-width', '1');
    backing.setAttribute('stroke-dasharray', '4 3');
    invGroup.appendChild(backing);

    const heading = document.createElementNS(SVG_NS, 'text');
    heading.setAttribute('x', String(bandX));
    heading.setAttribute('y', String(y + INV_TITLE_FONT * 0.9));
    heading.setAttribute('font-size', String(INV_TITLE_FONT));
    heading.setAttribute('font-weight', 'bold');
    heading.setAttribute('fill', '#92400e');
    heading.textContent = aggregate?.root
      ? `Invariants — enforced by root: ${aggregate.root}`
      : 'Invariants';
    invGroup.appendChild(heading);

    y += lineHeight(INV_TITLE_FONT) + INV_TITLE_GAP;

    const lh = lineHeight(INV_FONT);
    invItemLines.forEach((lines) => {
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

    container.appendChild(invGroup);
  }

  // ---- Legend ----------------------------------------------------------------
  const legendY = aggY + aggH + 16;
  const legendGroup = document.createElementNS(SVG_NS, 'g');
  legendGroup.setAttribute('class', 'd5-legend');

  const legendItems: { label: string; stroke: string; width: number; rx: number }[] = [
    { label: 'Aggregate Root', stroke: '#3b82f6', width: 3, rx: 3 },
    { label: 'Entity', stroke: '#3b82f6', width: 2, rx: 3 },
    { label: 'Value Object', stroke: '#10b981', width: 2, rx: 7 },
  ];

  let legendX = aggX;
  legendItems.forEach((item) => {
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
