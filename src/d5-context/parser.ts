import { D5ContextDb } from './db.js';
import { DIRECTION_RE } from '../shared/direction.js';

const TITLE_RE = /^\s*title\s+(.+)$/;
const BC_RE = /^\s*BoundedContext\(\s*(\w+)\s*,\s*"([^"]+)"\s*(?:,\s*team:\s*"([^"]+)")?\s*\)\s*(\{)?/;
const LANGUAGE_RE = /^\s*Language\s*\{/;
const TERM_RE = /^\s*Term\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/;
const AGGREGATE_RE = /^\s*Aggregate\(\s*(\w+)\s*,\s*"([^"]+)"\s*,\s*root:\s*"([^"]+)"(?:\s*,\s*fields:\s*"([^"]+)")?\s*\)/;
const READMODEL_RE = /^\s*ReadModel\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const DOMAIN_SERVICE_RE = /^\s*DomainService\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const PROCESS_RE = /^\s*Process\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const ACTOR_RE = /^\s*Actor\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const REL_RE = /^\s*Rel\(\s*(\w+)\s*,\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const EVENT_RE = /^\s*Event\(\s*(\w+)\s*,\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const COMMAND_RE = /^\s*Command\(\s*(\w+)\s*,\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const POLICY_RE = /^\s*Policy\(\s*(\w+)\s*,\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const CLOSE_BRACE_RE = /^\s*\}/;
const COMMENT_LINE_RE = /^\s*%%/;

function stripInlineComment(line: string): string {
  const idx = line.indexOf('%%');
  return idx === -1 ? line : line.slice(0, idx);
}

export function parse(text: string, db: D5ContextDb): void {
  const lines = text.split('\n');
  // The subject is the `BoundedContext(...) { ... }` with a body; a bodiless one is a
  // neighbouring context. Kept until the end so a diagram whose only BoundedContext has no
  // body (valid before neighbours existed) still gets it as its subject.
  let hasSubject = false;
  const bodiless: { id: string; label: string; team: string | undefined }[] = [];

  for (const raw of lines) {
    if (COMMENT_LINE_RE.test(raw)) continue;

    const line = stripInlineComment(raw).trim();
    if (line === '' || line === 'd5-context') continue;

    let m: RegExpMatchArray | null;

    if ((m = line.match(DIRECTION_RE))) {
      db.setDirection(m[1]);
    } else if ((m = line.match(TITLE_RE))) {
      db.setTitle(m[1].trim());
    } else if ((m = line.match(BC_RE))) {
      const team = m[3] || undefined;
      if (m[4]) {
        db.setBoundedContext(m[1], m[2], team);
        hasSubject = true;
      } else {
        bodiless.push({ id: m[1], label: m[2], team });
      }
    } else if (LANGUAGE_RE.test(line)) {
      // entering language block — nothing to store
    } else if ((m = line.match(TERM_RE))) {
      db.addTerm(m[1], m[2]);
    } else if ((m = line.match(AGGREGATE_RE))) {
      const fields = m[4] ? m[4].split(',').map((s) => s.trim()) : undefined;
      db.addAggregate(m[1], m[2], m[3], fields);
    } else if ((m = line.match(READMODEL_RE))) {
      db.addReadModel(m[1], m[2]);
    } else if ((m = line.match(DOMAIN_SERVICE_RE))) {
      db.addDomainService(m[1], m[2]);
    } else if ((m = line.match(PROCESS_RE))) {
      db.addProcess(m[1], m[2]);
    } else if ((m = line.match(ACTOR_RE))) {
      db.addActor(m[1], m[2]);
    } else if ((m = line.match(COMMAND_RE))) {
      db.addCommand(m[1], m[2], m[3]);
    } else if ((m = line.match(REL_RE))) {
      db.addRelationship(m[1], m[2], m[3]);
    } else if ((m = line.match(EVENT_RE))) {
      db.addEvent(m[1], m[2], m[3]);
    } else if ((m = line.match(POLICY_RE))) {
      db.addPolicy(m[1], m[2], m[3]);
    }
    // closing brace and unknown lines are silently ignored
  }

  if (!hasSubject) {
    const subject = bodiless.shift();
    if (subject) db.setBoundedContext(subject.id, subject.label, subject.team);
  }
  for (const n of bodiless) db.addNeighbour(n.id, n.label);
}
