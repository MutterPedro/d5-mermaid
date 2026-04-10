import { D5AggregateDb } from './db.js';

const TITLE_RE = /^\s*title\s+(.+)$/;
const AGGREGATE_RE = /^\s*Aggregate\(\s*(\w+)\s*,\s*"([^"]+)"\s*,\s*root:\s*"([^"]+)"\s*\)\s*\{/;
const ENTITY_RE = /^\s*Entity\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const VALUE_OBJECT_RE = /^\s*ValueObject\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const CLOSE_BRACE_RE = /^\s*\}/;
const COMMENT_LINE_RE = /^\s*%%/;

function stripInlineComment(line: string): string {
  const idx = line.indexOf('%%');
  return idx === -1 ? line : line.slice(0, idx);
}

export function parse(text: string, db: D5AggregateDb): void {
  const lines = text.split('\n');

  for (const raw of lines) {
    if (COMMENT_LINE_RE.test(raw)) continue;

    const line = stripInlineComment(raw).trim();
    if (line === '' || line === 'd5-aggregate') continue;

    let m: RegExpMatchArray | null;

    if ((m = line.match(TITLE_RE))) {
      db.setTitle(m[1].trim());
    } else if ((m = line.match(AGGREGATE_RE))) {
      db.setAggregate(m[1], m[2], m[3]);
    } else if ((m = line.match(ENTITY_RE))) {
      db.addEntity(m[1], m[2]);
    } else if ((m = line.match(VALUE_OBJECT_RE))) {
      db.addValueObject(m[1], m[2]);
    }
    // closing brace and unknown lines are silently ignored
  }
}
