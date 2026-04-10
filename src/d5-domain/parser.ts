import { D5DomainDb, type SubdomainType } from './db.js';

const TITLE_RE = /^\s*title\s+(.+)$/;
const DOMAIN_RE = /^\s*Domain\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)\s*\{/;
const SUBDOMAIN_RE = /^\s*Subdomain\(\s*(\w+)\s*,\s*"([^"]+)"\s*,\s*(\w+)\s*\)/;
const REL_RE = /^\s*Rel\(\s*(\w+)\s*,\s*(\w+)\s*(?:,\s*"([^"]+)")?\s*\)/;
const CLOSE_BRACE_RE = /^\s*\}/;
const COMMENT_LINE_RE = /^\s*%%/;

function stripInlineComment(line: string): string {
  const idx = line.indexOf('%%');
  return idx === -1 ? line : line.slice(0, idx);
}

export function parse(text: string, db: D5DomainDb): void {
  const lines = text.split('\n');

  for (const raw of lines) {
    if (COMMENT_LINE_RE.test(raw)) continue;

    const line = stripInlineComment(raw).trim();
    if (line === '' || line === 'd5-domain') continue;

    let m: RegExpMatchArray | null;

    if ((m = line.match(TITLE_RE))) {
      db.setTitle(m[1].trim());
    } else if ((m = line.match(DOMAIN_RE))) {
      db.setDomain(m[1], m[2]);
    } else if ((m = line.match(SUBDOMAIN_RE))) {
      db.addSubdomain(m[1], m[2], m[3] as SubdomainType);
    } else if ((m = line.match(REL_RE))) {
      db.addRelationship(m[1], m[2], m[3] ?? '');
    }
    // closing brace and unknown lines are silently ignored
  }
}
