// Shared, headless-safe text measurement + wrapping.
//
// Renderers build SVG in environments with no layout engine (vitest + jsdom), where
// `getBBox()` / `getComputedTextLength()` return 0. This module measures text with a
// real canvas 2d context when one is available (browsers) and falls back to a
// deterministic per-character estimator otherwise (jsdom). The estimator is tuned to
// run slightly generous so a box sized in the estimator env is not overflowed by the
// canvas env.

export interface FontSpec {
  /** font size in px */
  size: number;
  /** 'normal' | 'bold' | numeric weight */
  weight?: number | 'normal' | 'bold';
  family?: string;
}

export const UI_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const NARROW = new Set("ijltfI.,:;'|!()[]{}-/\\ ".split(''));
const WIDE = new Set('mwMW@%'.split(''));

let canvasCtx: CanvasRenderingContext2D | null | undefined;

function getCtx(): CanvasRenderingContext2D | null {
  if (canvasCtx !== undefined) return canvasCtx;
  // jsdom's canvas throws "Not implemented" (and logs to stderr) unless the optional
  // `canvas` package is installed — skip it there and use the estimator.
  const isJsdom =
    typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
  if (isJsdom) {
    canvasCtx = null;
    return canvasCtx;
  }
  try {
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    const ctx = c ? c.getContext('2d') : null;
    canvasCtx = ctx && typeof ctx.measureText === 'function' && ctx.measureText('M').width > 0 ? ctx : null;
  } catch {
    canvasCtx = null;
  }
  return canvasCtx;
}

function isBold(weight: FontSpec['weight']): boolean {
  return weight === 'bold' || (typeof weight === 'number' && weight >= 600);
}

const cache = new Map<string, number>();

/** Width of `text` in px for the given font. */
export function measureText(text: string, font: FontSpec): number {
  if (!text) return 0;
  const weight = font.weight ?? 'normal';
  const family = font.family ?? UI_FONT_FAMILY;
  const key = `${font.size}|${weight}|${family}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  let width: number;
  const ctx = getCtx();
  if (ctx) {
    ctx.font = `${isBold(weight) ? '700' : '400'} ${font.size}px ${family}`;
    width = ctx.measureText(text).width;
  } else {
    const boldFactor = isBold(weight) ? 1.05 : 1;
    let units = 0;
    for (const ch of text) {
      if (NARROW.has(ch)) units += 0.32;
      else if (WIDE.has(ch)) units += 0.87;
      else if (ch >= 'A' && ch <= 'Z') units += 0.7;
      else if (ch >= '0' && ch <= '9') units += 0.56;
      else units += 0.53;
    }
    width = units * font.size * boldFactor;
  }
  cache.set(key, width);
  return width;
}

/** Approximate line height for a font size. */
export function lineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.3);
}

/**
 * Greedy word-wrap `text` so each line fits within `maxWidth` px. A single word that
 * is itself wider than `maxWidth` is hard-broken between characters.
 */
export function wrapText(text: string, maxWidth: number, font: FontSpec): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = '';

  const pushHardBroken = (word: string) => {
    const chunks = hardBreak(word, maxWidth, font);
    for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
    line = chunks[chunks.length - 1] ?? '';
  };

  for (const word of words) {
    if (!line) {
      if (measureText(word, font) > maxWidth) pushHardBroken(word);
      else line = word;
      continue;
    }
    const candidate = `${line} ${word}`;
    if (measureText(candidate, font) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      if (measureText(word, font) > maxWidth) pushHardBroken(word);
      else line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function hardBreak(word: string, maxWidth: number, font: FontSpec): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of word) {
    if (cur && measureText(cur + ch, font) > maxWidth) {
      out.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [word];
}
