import type { D5AggregateDb } from './db.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const ITEM_WIDTH = 160;
const ITEM_HEIGHT = 40;
const GRID_PADDING = 20;
const AGGREGATE_OFFSET_Y = 60;

export function render(db: D5AggregateDb, container: SVGSVGElement): void {
  const title = db.getTitle();
  if (title) {
    const titleEl = document.createElementNS(SVG_NS, 'text');
    titleEl.setAttribute('class', 'd5-title');
    titleEl.setAttribute('x', '20');
    titleEl.setAttribute('y', '30');
    titleEl.textContent = title;
    container.appendChild(titleEl);
  }

  const aggregate = db.getAggregate();
  if (aggregate) {
    const aggGroup = document.createElementNS(SVG_NS, 'g');
    aggGroup.setAttribute('class', 'd5-aggregate');

    const aggLabel = document.createElementNS(SVG_NS, 'text');
    aggLabel.setAttribute('x', '20');
    aggLabel.setAttribute('y', String(AGGREGATE_OFFSET_Y));
    aggLabel.textContent = aggregate.label;
    aggGroup.appendChild(aggLabel);

    // Root entity — visually distinguished
    const rootGroup = document.createElementNS(SVG_NS, 'g');
    rootGroup.setAttribute('class', 'd5-aggregate-root');

    const rootLabel = document.createElementNS(SVG_NS, 'text');
    rootLabel.setAttribute('x', String(GRID_PADDING));
    rootLabel.setAttribute('y', String(AGGREGATE_OFFSET_Y + GRID_PADDING + ITEM_HEIGHT / 2));
    rootLabel.textContent = aggregate.root;
    rootGroup.appendChild(rootLabel);

    aggGroup.appendChild(rootGroup);
    container.appendChild(aggGroup);
  }

  let yOffset = AGGREGATE_OFFSET_Y + GRID_PADDING + ITEM_HEIGHT + GRID_PADDING;

  const entities = db.getEntities();
  entities.forEach((entity) => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'd5-entity');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(GRID_PADDING));
    rect.setAttribute('y', String(yOffset));
    rect.setAttribute('width', String(ITEM_WIDTH));
    rect.setAttribute('height', String(ITEM_HEIGHT));
    g.appendChild(rect);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(GRID_PADDING + ITEM_WIDTH / 2));
    labelText.setAttribute('y', String(yOffset + ITEM_HEIGHT / 2));
    labelText.textContent = entity.label;
    g.appendChild(labelText);

    container.appendChild(g);
    yOffset += ITEM_HEIGHT + GRID_PADDING;
  });

  const valueObjects = db.getValueObjects();
  valueObjects.forEach((vo) => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'd5-value-object');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(GRID_PADDING));
    rect.setAttribute('y', String(yOffset));
    rect.setAttribute('width', String(ITEM_WIDTH));
    rect.setAttribute('height', String(ITEM_HEIGHT));
    g.appendChild(rect);

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', String(GRID_PADDING + ITEM_WIDTH / 2));
    labelText.setAttribute('y', String(yOffset + ITEM_HEIGHT / 2));
    labelText.textContent = vo.label;
    g.appendChild(labelText);

    container.appendChild(g);
    yOffset += ITEM_HEIGHT + GRID_PADDING;
  });
}
