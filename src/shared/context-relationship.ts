// Canonical DDD context-mapping relationship patterns, and how to draw each one.
//
// `d5-subdomain` relationship labels are meant to be one of Evans' context-map patterns.
// When the label matches (case / spacing / abbreviation insensitive) the renderer draws a
// compact badge + upstream/downstream role markers + pattern-specific line decoration
// instead of a plain text pill. An unrecognised label falls back to the plain pill.

export type RelKind = 'directional' | 'symmetric' | 'none';

export interface RelPattern {
  /** canonical display name */
  name: string;
  /** compact badge text drawn on the edge (empty ⇒ no badge) */
  badge: string;
  kind: RelKind;
  /** role marker at the upstream (source) end — directional patterns only */
  upstreamRole?: string;
  /** role marker at the downstream (target) end — directional patterns only */
  downstreamRole?: string;
  /** draw an anti-corruption-layer gate near the downstream end */
  aclGate?: boolean;
  /** draw an open-host-service socket near the upstream end */
  ohsSocket?: boolean;
  /** dashed stroke (Separate Ways) */
  dashed?: boolean;
  /** doubled stroke (Shared Kernel) */
  doubleStroke?: boolean;
  /** heavier stroke (Partnership) */
  thick?: boolean;
}

interface Entry {
  keys: string[];
  pattern: RelPattern;
}

const TABLE: Entry[] = [
  {
    keys: ['partnership', 'p'],
    pattern: { name: 'Partnership', badge: 'P', kind: 'symmetric', thick: true },
  },
  {
    keys: ['sharedkernel', 'sk'],
    pattern: { name: 'Shared Kernel', badge: 'SK', kind: 'symmetric', doubleStroke: true },
  },
  {
    keys: ['customersupplier', 'customersupplier', 'cs', 'cusup'],
    pattern: {
      name: 'Customer-Supplier',
      badge: 'C/S',
      kind: 'directional',
      upstreamRole: 'S',
      downstreamRole: 'C',
    },
  },
  {
    keys: ['conformist', 'cf'],
    pattern: {
      name: 'Conformist',
      badge: 'CF',
      kind: 'directional',
      upstreamRole: 'U',
      downstreamRole: 'D',
    },
  },
  {
    keys: ['anticorruptionlayer', 'anticorruption', 'acl'],
    pattern: {
      name: 'Anti-Corruption Layer',
      badge: 'ACL',
      kind: 'directional',
      upstreamRole: 'U',
      downstreamRole: 'D',
      aclGate: true,
    },
  },
  {
    keys: ['openhostservice', 'ohs'],
    pattern: {
      name: 'Open Host Service',
      badge: 'OHS',
      kind: 'directional',
      upstreamRole: 'U',
      downstreamRole: 'D',
      ohsSocket: true,
    },
  },
  {
    keys: ['publishedlanguage', 'pl'],
    pattern: {
      name: 'Published Language',
      badge: 'PL',
      kind: 'directional',
      upstreamRole: 'U',
      downstreamRole: 'D',
    },
  },
  {
    keys: ['separateways', 'sw'],
    pattern: { name: 'Separate Ways', badge: '', kind: 'none', dashed: true },
  },
  {
    keys: ['bigballofmud', 'bbom', 'bbm'],
    pattern: {
      name: 'Big Ball of Mud',
      badge: 'BBoM',
      kind: 'directional',
      upstreamRole: 'U',
      downstreamRole: 'D',
    },
  },
];

function normalize(label: string): string {
  return label.trim().toLowerCase().replace(/[\s_/()-]+/g, '');
}

/** Returns the matching context-map pattern, or `null` for a free-text label. */
export function classifyRelationship(label: string): RelPattern | null {
  const norm = normalize(label);
  for (const { keys, pattern } of TABLE) {
    if (keys.includes(norm)) return pattern;
  }
  return null;
}
