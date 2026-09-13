// Dependency-free pan/zoom for a rendered D5 (or any) SVG diagram.
//
// Mermaid's `render()` only produces static SVG — navigating it (zoom, pan) is left to
// whatever embeds that SVG. `attachPanZoom` bolts that on: CSS `transform` on the <svg>
// itself, driven by wheel (zoom toward the cursor), pointer drag (pan), and double-click
// (zoom in), plus an optional +/−/fit control cluster.
//
// A `svg-pan-zoom`-style library was tried first, but it sizes itself from the SVG's own
// width/height *attributes* — mermaid emits `width="100%"` there for responsive embedding,
// which such libraries can't turn into a usable pixel size. This reads only the `viewBox`
// (the actual content size) and the container's own measured box, sidestepping that.

import { markOverlay, isOverlayEvent } from './overlay.js';

const CONTROLS_ATTR = 'data-d5-pan-zoom-controls';

export interface PanZoomOptions {
  /** Smallest allowed scale. Default 0.05. */
  minScale?: number;
  /** Largest allowed scale. Default 20. */
  maxScale?: number;
  /** Multiplier applied per wheel notch. Default 1.15. */
  wheelStep?: number;
  /** Multiplier applied per double-click. Default 1.6. */
  dblClickStep?: number;
  /** Fraction of the container's size `fit()` scales the diagram into. Default 0.94. */
  fitPadding?: number;
  /** Render the +/−/fit button cluster. Default true. */
  controls?: boolean;
  /** Render the "scroll to zoom · drag to pan" hint. Default true; a string overrides the text. */
  hint?: boolean | string;
}

export interface PanZoomHandle {
  /** Re-center and scale the diagram to fill the container (also run once on attach). */
  fit(): void;
  zoomIn(): void;
  zoomOut(): void;
  getScale(): number;
  /** Removes the listeners and any controls/hint this call added. Safe to call once. */
  destroy(): void;
}


/**
 * Attach pan/zoom to an already-rendered `<svg>` (e.g. the output of `mermaid.render()`).
 * `container` (default: the svg's own parent) is where controls/hint are anchored and
 * where drag/wheel/dblclick are listened for; it's given `position: relative` (if it was
 * `static`), `overflow: hidden`, and a grab cursor.
 */
export function attachPanZoom(
  svg: SVGSVGElement,
  containerArg: HTMLElement | null = svg.parentElement,
  options: PanZoomOptions = {},
): PanZoomHandle {
  if (!containerArg) {
    throw new Error('attachPanZoom: no container (svg has no parentElement and none was given)');
  }
  const container = containerArg;
  const minScale = options.minScale ?? 0.05;
  const maxScale = options.maxScale ?? 20;
  const wheelStep = options.wheelStep ?? 1.15;
  const dblClickStep = options.dblClickStep ?? 1.6;
  const fitPadding = options.fitPadding ?? 0.94;
  const withControls = options.controls ?? true;
  const hintText = options.hint === false ? null : options.hint === true || options.hint === undefined
    ? 'Scroll to zoom · drag to pan · double-click to zoom in'
    : options.hint;

  const vb = svg.viewBox.baseVal;
  let scale = 1;
  let x = 0;
  let y = 0;
  let panning = false;
  let startX = 0;
  let startY = 0;

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  container.style.overflow = 'hidden';
  container.style.touchAction = 'none';
  container.style.cursor = 'grab';
  svg.style.transformOrigin = '0 0';

  function apply(): void {
    svg.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function zoomAt(cx: number, cy: number, factor: number): void {
    const next = Math.min(Math.max(scale * factor, minScale), maxScale);
    x = cx - ((cx - x) / scale) * next;
    y = cy - ((cy - y) / scale) * next;
    scale = next;
    apply();
  }

  function fit(): void {
    if (!vb.width || !vb.height) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return; // container not laid out yet — caller can retry
    scale = Math.min(cw / vb.width, ch / vb.height) * fitPadding;
    x = (cw - vb.width * scale) / 2;
    y = (ch - vb.height * scale) / 2;
    apply();
  }

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const r = container.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? wheelStep : 1 / wheelStep);
  };

  // Guard against overlay UI — this helper's own controls, but also e.g. an attachToggle
  // checklist sharing this same container: capturing the pointer here on every pointerdown
  // (needed so a fast drag keeps tracking outside the container) retargets the browser's
  // synthesized `click` event away from whatever element the pointerdown started on — a
  // click that starts on a button/checkbox never reaches its own click handler otherwise.
  const onPointerDown = (e: PointerEvent): void => {
    if (isOverlayEvent(e)) return;
    panning = true;
    startX = e.clientX - x;
    startY = e.clientY - y;
    // Not every environment implements pointer capture (jsdom doesn't); it's a nice-to-have
    // (keeps a fast drag tracking once the cursor leaves the container) so degrade quietly.
    if (typeof container.setPointerCapture === 'function') {
      container.setPointerCapture(e.pointerId);
    }
    container.classList.add('d5-panning');
    container.style.cursor = 'grabbing';
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (!panning) return;
    x = e.clientX - startX;
    y = e.clientY - startY;
    apply();
  };
  const onPointerUp = (): void => {
    panning = false;
    container.classList.remove('d5-panning');
    container.style.cursor = 'grab';
  };
  const onDblClick = (e: MouseEvent): void => {
    if (isOverlayEvent(e)) return;
    const r = container.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, dblClickStep);
  };

  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('dblclick', onDblClick);

  let controlsEl: HTMLElement | null = null;
  let hintEl: HTMLElement | null = null;

  if (withControls) {
    controlsEl = document.createElement('div');
    controlsEl.setAttribute(CONTROLS_ATTR, '');
    markOverlay(controlsEl);
    Object.assign(controlsEl.style, {
      position: 'absolute',
      right: '8px',
      bottom: '6px',
      zIndex: '10',
      display: 'flex',
      gap: '4px',
    } as CSSStyleDeclaration);

    const makeButton = (label: string, title: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.title = title;
      Object.assign(btn.style, {
        width: '24px',
        height: '24px',
        borderRadius: '5px',
        border: '1px solid #cbd5e1',
        background: 'rgba(255,255,255,0.95)',
        color: '#334155',
        fontSize: '14px',
        lineHeight: '1',
        cursor: 'pointer',
        padding: '0',
      } as CSSStyleDeclaration);
      btn.addEventListener('click', onClick);
      return btn;
    };

    controlsEl.appendChild(makeButton('+', 'Zoom in', () => zoomAt(container.clientWidth / 2, container.clientHeight / 2, 1.3)));
    controlsEl.appendChild(makeButton('−', 'Zoom out', () => zoomAt(container.clientWidth / 2, container.clientHeight / 2, 1 / 1.3)));
    controlsEl.appendChild(makeButton('⤢', 'Fit to view', fit));
    container.appendChild(controlsEl);
  }

  if (hintText) {
    hintEl = document.createElement('div');
    hintEl.textContent = hintText;
    Object.assign(hintEl.style, {
      position: 'absolute',
      left: '8px',
      bottom: '6px',
      zIndex: '10',
      font: '11px -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#94a3b8',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    container.appendChild(hintEl);
  }

  fit();
  // The expected call shape is `container.innerHTML = svg; attachPanZoom(svg, container)`
  // — synchronously back to back. On a container's very first layout (e.g. right after page
  // load) the browser hasn't necessarily laid it out yet at that point, so `fit()` above can
  // read a momentarily-zero clientWidth/clientHeight and no-op (confirmed live: `getScale()`
  // came back `1`, i.e. never fitted, on a plain first load — not a contrived race). One
  // retry on the next frame covers it without risking a retry loop against a container
  // that's zero-size on purpose (e.g. `display: none`).
  if ((!container.clientWidth || !container.clientHeight) && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(fit);
  }

  return {
    fit,
    zoomIn: () => zoomAt(container.clientWidth / 2, container.clientHeight / 2, 1.3),
    zoomOut: () => zoomAt(container.clientWidth / 2, container.clientHeight / 2, 1 / 1.3),
    getScale: () => scale,
    destroy: () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('dblclick', onDblClick);
      controlsEl?.remove();
      hintEl?.remove();
    },
  };
}
