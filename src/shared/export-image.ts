// Dependency-free PNG export for a rendered D5 (or any) SVG diagram.
//
// The SVG is vector, so "good resolution to zoom in on" is just a matter of rasterizing it
// at a multiple of its natural (viewBox) size. The pipeline is: clone the live <svg>, strip
// the pan/zoom transform (so the export is the whole diagram at rest, whatever the viewer
// is currently looking at), bake the styles the browser resolved from the host page's CSS
// into the clone (an <svg> loaded as an <img> can't see the page's stylesheets), serialize
// it to a data: URL, let an <img> rasterize it into a <canvas> at `scale`× and read the
// canvas back as a PNG blob.
//
// A data: URL rather than a blob: URL on purpose — Safari taints the canvas for a blob: URL
// of an SVG, which makes `toBlob()` throw.

import { markOverlay } from './overlay.js';

const BUTTON_ATTR = 'data-d5-export-button';
const DEFAULT_FILENAME = 'd5-diagram';

export interface ExportPngOptions {
  /** Pixels rendered per diagram unit (viewBox unit). Default 4. Lowered automatically if it
   * would exceed `maxDimension` / `maxPixels`. */
  scale?: number;
  /** Longest side of the PNG, in px, the scale is capped to. Default 16384 (the limit
   * browsers' canvases commonly top out at). */
  maxDimension?: number;
  /** Total pixel count (width × height) the scale is capped to. Default 67108864 (8192²) —
   * well under what Chrome/Firefox allow, but some mobile Safari builds fail far lower. */
  maxPixels?: number;
  /** Fill behind the diagram — any CSS color, or `"transparent"`. Default `"#ffffff"`. */
  background?: string;
  /** Empty margin around the diagram, in diagram units. Default 16. */
  padding?: number;
}

export interface DownloadPngOptions extends ExportPngOptions {
  /** File name, with or without the `.png`. Default: the diagram's own title, slugified,
   * or `d5-diagram`. */
  filename?: string;
}

export interface ExportButtonOptions extends DownloadPngOptions {
  /** Button label. Default "PNG". */
  label?: string;
  /** Called with the finished blob after the download is triggered. */
  onExport?: (blob: Blob) => void;
  /** Called if the export fails. Default: `console.error`. */
  onError?: (error: unknown) => void;
}

export interface ExportHandle {
  /** Rasterize the diagram and resolve with the PNG, without downloading it. */
  toBlob(options?: ExportPngOptions): Promise<Blob>;
  /** Rasterize the diagram and trigger a browser download of the PNG. */
  download(options?: DownloadPngOptions): Promise<void>;
  /** Removes the button this call added. Safe to call once. */
  destroy(): void;
}

// What the browser resolved from the page's CSS that a standalone SVG image wouldn't know.
const BAKED_STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'text-decoration',
  'dominant-baseline',
];

// Set by attachPanZoom (and by mermaid itself for max-width) — meaningful to the viewer,
// not to a rasterized copy of the diagram.
const VIEWER_STYLE_PROPS = ['transform', 'transform-origin', 'max-width'];

export interface ExportSvg {
  /** Serialized, self-contained SVG markup, sized to the output pixel dimensions. */
  markup: string;
  /** Output width in px. */
  width: number;
  /** Output height in px. */
  height: number;
}

/** Output size for a `w`×`h` diagram, with `scale` reduced as needed to respect the caps. */
export function computeExportSize(
  w: number,
  h: number,
  options: ExportPngOptions = {},
): { width: number; height: number; scale: number } {
  const requested = options.scale ?? 4;
  const maxDimension = options.maxDimension ?? 16384;
  const maxPixels = options.maxPixels ?? 67108864;
  const scale = Math.min(requested, maxDimension / Math.max(w, h), Math.sqrt(maxPixels / (w * h)));
  return { width: Math.max(1, Math.floor(w * scale)), height: Math.max(1, Math.floor(h * scale)), scale };
}

/** Clones `svg` into a standalone, serialized SVG at its export size. Pure with respect to
 * the live `svg` — nothing in the page is touched. */
export function buildExportSvg(svg: SVGSVGElement, options: ExportPngOptions = {}): ExportSvg {
  const vb = svg.viewBox.baseVal;
  if (!vb || !vb.width || !vb.height) {
    throw new Error('exportPng: the svg has no viewBox to size the image from');
  }
  const padding = options.padding ?? 16;
  const w = vb.width + padding * 2;
  const h = vb.height + padding * 2;
  const size = computeExportSize(w, h, options);

  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Bake resolved styles in before the stylesheets-from-the-page context is lost. The two
  // trees are identical, so their element lists line up index for index.
  const live = svg.querySelectorAll('*');
  const copy = clone.querySelectorAll('*');
  live.forEach((el, i) => {
    const target = copy[i] as SVGElement | undefined;
    if (!target) return;
    const computed = getComputedStyle(el);
    for (const prop of BAKED_STYLE_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) target.style.setProperty(prop, value);
    }
  });

  for (const prop of VIEWER_STYLE_PROPS) clone.style.removeProperty(prop);
  if (!clone.getAttribute('style')) clone.removeAttribute('style');

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `${vb.x - padding} ${vb.y - padding} ${w} ${h}`);
  // Explicit pixel size: mermaid emits width="100%", which an <img> has no basis to resolve,
  // and Firefox won't rasterize a viewBox-only SVG at anything but its tiny default size.
  clone.setAttribute('width', String(size.width));
  clone.setAttribute('height', String(size.height));

  return { markup: new XMLSerializer().serializeToString(clone), width: size.width, height: size.height };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('exportPng: the browser could not rasterize the svg'));
    img.src = src;
  });
}

/** Rasterize `svg` to a PNG. Resolves with the blob; nothing is downloaded. */
export async function exportPng(svg: SVGSVGElement, options: ExportPngOptions = {}): Promise<Blob> {
  const { markup, width, height } = buildExportSvg(svg, options);
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('exportPng: no 2D canvas context available');

  const background = options.background ?? '#ffffff';
  if (background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('exportPng: the canvas could not be encoded (image too large for this browser?)'));
    }, 'image/png');
  });
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveFilename(svg: SVGSVGElement, filename?: string): string {
  const base = filename ?? (slug(svg.querySelector('.d5-title')?.textContent ?? '') || DEFAULT_FILENAME);
  return /\.png$/i.test(base) ? base : `${base}.png`;
}

/** Rasterize `svg` to a PNG and trigger a browser download of it. */
export async function downloadPng(svg: SVGSVGElement, options: DownloadPngOptions = {}): Promise<Blob> {
  const blob = await exportPng(svg, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = resolveFilename(svg, options.filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob;
}

/**
 * Adds a "download as PNG" button to `container` (default: the svg's own parent), top-right,
 * clear of `attachPanZoom`'s controls (bottom) and an `attach<Type>Toggle` checklist
 * (top-left) — it's marked as overlay UI, so a shared `attachPanZoom` doesn't swallow its
 * clicks. The export always captures the whole diagram at rest, regardless of the current
 * pan/zoom; what's drawn is what's exported, so components an `attach<Type>Toggle` has
 * unchecked (and so removed from the svg) are left out of the PNG too.
 */
export function attachExport(
  svg: SVGSVGElement,
  containerArg: HTMLElement | null = svg.parentElement,
  options: ExportButtonOptions = {},
): ExportHandle {
  if (!containerArg) {
    throw new Error('attachExport: no container (svg has no parentElement and none was given)');
  }
  const container = containerArg;
  const label = options.label ?? 'PNG';
  const onError = options.onError ?? ((e: unknown) => console.error(e));

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(BUTTON_ATTR, '');
  markOverlay(button);
  button.textContent = `⤓ ${label}`;
  button.title = 'Download diagram as PNG';
  Object.assign(button.style, {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: '10',
    height: '24px',
    padding: '0 8px',
    borderRadius: '5px',
    border: '1px solid #cbd5e1',
    background: 'rgba(255,255,255,0.95)',
    color: '#334155',
    font: '11px -apple-system, BlinkMacSystemFont, sans-serif',
    cursor: 'pointer',
  } as CSSStyleDeclaration);

  const download = async (extra: DownloadPngOptions = {}): Promise<void> => {
    await downloadPng(svg, { ...options, ...extra });
  };

  let busy = false;
  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    try {
      // Awaited on its own line: `onExport?.(await ...)` would skip the download entirely
      // whenever no onExport was given.
      const blob = await downloadPng(svg, options);
      options.onExport?.(blob);
    } catch (err) {
      onError(err);
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
  container.appendChild(button);

  return {
    toBlob: (extra = {}) => exportPng(svg, { ...options, ...extra }),
    download,
    destroy: () => button.remove(),
  };
}
