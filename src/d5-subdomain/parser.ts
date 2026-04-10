import { D5SubdomainDb, type SubdomainType } from './db.js';

const TITLE_RE = /^\s*title\s+(.+)$/;
const SUBDOMAIN_RE = /^\s*Subdomain\(\s*(\w+)\s*,\s*"([^"]+)"\s*,\s*(\w+)\s*\)\s*\{/;
const BC_RE = /^\s*BoundedContext\(\s*(\w+)\s*,\s*"([^"]+)"\s*(?:,\s*team:\s*"([^"]+)")?\s*\)/;
const REL_RE = /^\s*Rel\(\s*(\w+)\s*,\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const CLOSE_BRACE_RE = /^\s*\}/;
const COMMENT_LINE_RE = /^\s*%%/;

function stripInlineComment(line: string): string {
  const idx = line.indexOf('%%');
  return idx === -1 ? line : line.slice(0, idx);
}

export function parse(text: string, db: D5SubdomainDb): void {
  const lines = text.split('\n');
  let currentSubdomainId: string | undefined;

  for (const raw of lines) {
    if (COMMENT_LINE_RE.test(raw)) continue;

    const line = stripInlineComment(raw).trim();
    if (line === '' || line === 'd5-subdomain') continue;

    let m: RegExpMatchArray | null;

    if ((m = line.match(TITLE_RE))) {
      db.setTitle(m[1].trim());
    } else if ((m = line.match(SUBDOMAIN_RE))) {
      db.addSubdomain(m[1], m[2], m[3] as SubdomainType);
      currentSubdomainId = m[1];
    } else if ((m = line.match(BC_RE))) {
      const team = m[3] || undefined;
      db.addBoundedContext(m[1], m[2], currentSubdomainId!, team);
    } else if ((m = line.match(REL_RE))) {
      db.addRelationship(m[1], m[2], m[3]);
    } else if (CLOSE_BRACE_RE.test(line)) {
      currentSubdomainId = undefined;
    }
  }
}
