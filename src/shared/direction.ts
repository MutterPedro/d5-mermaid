// Shared layout-direction handling for the `direction` line.

export type Direction = 'LR' | 'RL' | 'TB' | 'BT';

/**
 * Normalise an author-supplied direction token. Accepts `LR` / `RL` / `TB` / `TD` / `BT`
 * (case-insensitive); `TD` is treated as `TB`. Returns `null` for anything else.
 */
export function normalizeDirection(value: string): Direction | null {
  const d = value.trim().toUpperCase();
  const normalized = d === 'TD' ? 'TB' : d;
  return normalized === 'LR' ||
    normalized === 'RL' ||
    normalized === 'TB' ||
    normalized === 'BT'
    ? (normalized as Direction)
    : null;
}

/** Matches a stand-alone `direction <token>` line. */
export const DIRECTION_RE = /^\s*direction\s+(LR|RL|TB|TD|BT)\s*$/i;

/**
 * Whether an edge from `src` to `tgt` runs against the graph's rank/flow axis for the
 * given Dagre `rankdir`. Each `direction` puts the flow on a different axis and polarity
 * (empirically verified against `@dagrejs/dagre`, not assumed):
 *
 * - `TB`: forward is `tgt.y > src.y` — against-flow when `tgt.y < src.y`.
 * - `BT`: forward is `tgt.y < src.y` — against-flow when `tgt.y > src.y`.
 * - `LR`: forward is `tgt.x > src.x` — against-flow when `tgt.x < src.x`.
 * - `RL`: forward is `tgt.x < src.x` — against-flow when `tgt.x > src.x`.
 */
export function isAgainstFlow(
  direction: Direction,
  src: { x: number; y: number },
  tgt: { x: number; y: number },
): boolean {
  switch (direction) {
    case 'TB':
      return tgt.y < src.y - 1;
    case 'BT':
      return tgt.y > src.y + 1;
    case 'LR':
      return tgt.x < src.x - 1;
    case 'RL':
      return tgt.x > src.x + 1;
    default:
      return false;
  }
}
