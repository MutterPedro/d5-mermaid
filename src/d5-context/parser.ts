import { D5ContextDb } from './db.js';

const TITLE_RE = /^\s*title\s+(.+)$/;
const BC_RE = /^\s*BoundedContext\(\s*(\w+)\s*,\s*"([^"]+)"\s*(?:,\s*team:\s*"([^"]+)")?\s*\)\s*\{?/;
const LANGUAGE_RE = /^\s*Language\s*\{/;
const TERM_RE = /^\s*Term\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/;
const AGGREGATE_RE = /^\s*Aggregate\(\s*(\w+)\s*,\s*"([^"]+)"\s*,\s*root:\s*"([^"]+)"(?:\s*,\s*fields:\s*"([^"]+)")?\s*\)/;
const REL_RE = /^\s*Rel\(\s*(\w+)\s*,\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const CLOSE_BRACE_RE = /^\s*\}/;
const COMMENT_LINE_RE = /^\s*%%/;

function stripInlineComment(line: string): string {
  const idx = line.indexOf('%%');
  return idx === -1 ? line : line.slice(0, idx);
}

export function parse(text: string, db: D5ContextDb): void {
  const lines = text.split('\n');

  for (const raw of lines) {
    if (COMMENT_LINE_RE.test(raw)) continue;

    const line = stripInlineComment(raw).trim();
    if (line === '' || line === 'd5-context') continue;

    let m: RegExpMatchArray | null;

    if ((m = line.match(TITLE_RE))) {
      db.setTitle(m[1].trim());
    } else if ((m = line.match(BC_RE))) {
      const team = m[3] || undefined;
      db.setBoundedContext(m[1], m[2], team);
    } else if (LANGUAGE_RE.test(line)) {
      // entering language block — nothing to store
    } else if ((m = line.match(TERM_RE))) {
      db.addTerm(m[1], m[2]);
    } else if ((m = line.match(AGGREGATE_RE))) {
      const fields = m[4] ? m[4].split(',').map((s) => s.trim()) : undefined;
      db.addAggregate(m[1], m[2], m[3], fields);
    } else if ((m = line.match(REL_RE))) {
      db.addRelationship(m[1], m[2], m[3]);
    }
    // closing brace and unknown lines are silently ignored
  }
}
