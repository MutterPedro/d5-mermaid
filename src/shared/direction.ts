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
