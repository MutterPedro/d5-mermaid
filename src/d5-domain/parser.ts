import { D5DomainDb, type SubdomainType } from './db.js';
import { DIRECTION_RE } from '../shared/direction.js';

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

  // A diagram may declare more than one top-level `Domain(...) { ... }` block; track which
  // one we're currently inside so `Subdomain(...)` lines are attributed to the right domain.
  // Domain blocks don't nest in `d5-domain`, so a single slot (cleared on `}`) is enough.
  let currentDomainId: string | undefined;

  for (const raw of lines) {
    if (COMMENT_LINE_RE.test(raw)) continue;

    const line = stripInlineComment(raw).trim();
    if (line === '' || line === 'd5-domain') continue;

    let m: RegExpMatchArray | null;

    if ((m = line.match(DIRECTION_RE))) {
      db.setDirection(m[1]);
    } else if ((m = line.match(TITLE_RE))) {
      db.setTitle(m[1].trim());
    } else if ((m = line.match(DOMAIN_RE))) {
      db.addDomain(m[1], m[2]);
      currentDomainId = m[1];
    } else if ((m = line.match(SUBDOMAIN_RE))) {
      if (currentDomainId) db.addSubdomain(m[1], m[2], m[3] as SubdomainType, currentDomainId);
    } else if ((m = line.match(REL_RE))) {
      db.addRelationship(m[1], m[2], m[3] ?? '');
    } else if (CLOSE_BRACE_RE.test(line)) {
      currentDomainId = undefined;
    }
    // unknown lines are silently ignored
  }
}
