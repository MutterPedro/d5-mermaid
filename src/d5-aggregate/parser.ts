import { D5AggregateDb, MULTIPLICITIES, type Multiplicity } from './db.js';

const TITLE_RE = /^\s*title\s+(.+)$/;
const AGGREGATE_RE = /^\s*Aggregate\(\s*(\w+)\s*,\s*"([^"]+)"\s*,\s*root:\s*"([^"]+)"\s*\)\s*\{/;
// bodiless: another aggregate, declared outside the subject's block, that a `Ref` points at
const NEIGHBOUR_RE = /^\s*Aggregate\(\s*(\w+)\s*,\s*"([^"]+)"\s*,\s*root:\s*"([^"]+)"\s*\)/;
const ENTITY_RE = /^\s*Entity\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const VALUE_OBJECT_RE = /^\s*ValueObject\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const INVARIANTS_RE = /^\s*Invariants\s*\{/;
const INVARIANT_RE = /^\s*Invariant\(\s*"([^"]+)"\s*(?:,\s*"([^"]+)")?\s*\)/;
const MULTIPLICITY = `(?:\\s*,\\s*(${MULTIPLICITIES.join('|')}))?`;
const ROLE = '(?:\\s*,\\s*as:\\s*"([^"]+)")?';
const HAS_RE = new RegExp(`^\\s*Has\\(\\s*(\\w+)\\s*,\\s*(\\w+)${MULTIPLICITY}${ROLE}\\s*\\)`);
const REF_RE = new RegExp(`^\\s*Ref\\(\\s*(\\w+)\\s*,\\s*(\\w+)${MULTIPLICITY}${ROLE}\\s*\\)`);
const COMMAND_RE = /^\s*Command\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const EVENT_RE = /^\s*Event\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const EMITS_RE = /^\s*Emits\(\s*(\w+)\s*,\s*(\w+)\s*\)/;
const LIFECYCLE_RE = /^\s*Lifecycle\s*\{/;
const STATE_RE = /^\s*State\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/;
const TRANSITION_RE = /^\s*Transition\(\s*(\w+)\s*,\s*(\w+)\s*(?:,\s*on:\s*(\w+))?\s*\)/;
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
    } else if ((m = line.match(NEIGHBOUR_RE))) {
      db.addNeighbour(m[1], m[2], m[3]);
    } else if ((m = line.match(HAS_RE))) {
      db.addHas(m[1], m[2], m[3] as Multiplicity | undefined, m[4]);
    } else if ((m = line.match(REF_RE))) {
      db.addRef(m[1], m[2], m[3] as Multiplicity | undefined, m[4]);
    } else if ((m = line.match(COMMAND_RE))) {
      db.addCommand(m[1], m[2]);
    } else if ((m = line.match(EVENT_RE))) {
      db.addEvent(m[1], m[2]);
    } else if ((m = line.match(EMITS_RE))) {
      db.addEmits(m[1], m[2]);
    } else if (LIFECYCLE_RE.test(line)) {
      // entering the Lifecycle block — nothing to store
    } else if ((m = line.match(STATE_RE))) {
      db.addState(m[1], m[2]);
    } else if ((m = line.match(TRANSITION_RE))) {
      db.addTransition(m[1], m[2], m[3]);
    } else if (INVARIANTS_RE.test(line)) {
      // entering the Invariants block — nothing to store
    } else if ((m = line.match(INVARIANT_RE))) {
      // one-arg: Invariant("rule")  ·  two-arg: Invariant("Subject", "rule")
      if (m[2] !== undefined) db.addInvariant(m[2], m[1]);
      else db.addInvariant(m[1]);
    } else if ((m = line.match(ENTITY_RE))) {
      db.addEntity(m[1], m[2]);
    } else if ((m = line.match(VALUE_OBJECT_RE))) {
      db.addValueObject(m[1], m[2]);
    }
    // closing brace and unknown lines are silently ignored
  }
}
