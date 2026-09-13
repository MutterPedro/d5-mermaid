import { describe, it, expect, beforeEach } from 'vitest';
import { attachPanZoom } from '../src/shared/pan-zoom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** jsdom does no real layout — every element measures 0×0 — so tests that need `fit()` /
 * `container.clientWidth` to see a real box stub those two getters. */
function stubSize(el: HTMLElement, width: number, height: number): void {
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

function getTransform(svg: SVGSVGElement): { x: number; y: number; scale: number } {
  const style = svg.style.transform; // "translate(Xpx, Ypx) scale(S)"
  const m = style.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
  if (!m) throw new Error(`unexpected transform: "${style}"`);
  return { x: Number(m[1]), y: Number(m[2]), scale: Number(m[3]) };
}

function setUp(vbW = 500, vbH = 300, containerW = 1000, containerH = 600) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  container.appendChild(svg);
  stubSize(container, containerW, containerH);
  return { container, svg };
}

function pointerEvent(type: string, x: number, y: number, id = 1): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id });
}

describe('attachPanZoom', () => {
  let container: HTMLDivElement;
  let svg: SVGSVGElement;

  beforeEach(() => {
    ({ container, svg } = setUp());
  });

  it('fits the diagram to the container on attach', () => {
    const pz = attachPanZoom(svg, container);
    // container is 1000x600, viewBox is 500x300 -> width is the limiting axis (2x vs 2x,
    // tied, so fitPadding alone determines scale: min(1000/500, 600/300) * 0.94 = 1.88
    expect(pz.getScale()).toBeCloseTo(2 * 0.94, 5);
  });

  // Regression test for a real bug caught by hand-testing in a browser: the natural calling
  // shape is `container.innerHTML = svg; attachPanZoom(svg, container)`, synchronously back
  // to back — but on a container's very first layout, the browser hasn't necessarily laid it
  // out yet at that exact point, so the initial `fit()` read a momentarily-zero
  // clientWidth/clientHeight and silently gave up (confirmed live: `getScale()` came back `1`,
  // i.e. never fitted, on a plain first load of the example page — not a contrived race).
  it('retries fit() on the next frame if the container had no size yet at attach time', async () => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    const s = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    s.setAttribute('viewBox', '0 0 500 300');
    c.appendChild(s);
    // jsdom containers default to 0x0 (no real layout) — stands in for "not laid out yet".

    const pz = attachPanZoom(s, c);
    expect(pz.getScale()).toBe(1); // the synchronous fit() call found no size, and no-oped

    // The container becoming measurable simulates the browser's first layout pass landing
    // on the next frame; the retry `attachPanZoom` scheduled should pick it up.
    stubSize(c, 1000, 600);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(pz.getScale()).toBeCloseTo((1000 / 500) * 0.94, 5);
  });

  it('does not throw and leaves scale at 1 when the container has no measurable size', () => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    const s = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    s.setAttribute('viewBox', '0 0 100 100');
    c.appendChild(s);
    const pz = attachPanZoom(s, c);
    expect(pz.getScale()).toBe(1);
  });

  it('zoomIn / zoomOut change scale around the container center', () => {
    const pz = attachPanZoom(svg, container);
    const before = pz.getScale();
    pz.zoomIn();
    expect(pz.getScale()).toBeGreaterThan(before);
    const afterIn = pz.getScale();
    pz.zoomOut();
    expect(pz.getScale()).toBeLessThan(afterIn);
  });

  it('fit() re-centers and re-scales after a pan/zoom', () => {
    const pz = attachPanZoom(svg, container);
    const fittedX = getTransform(svg).x;

    pz.zoomIn();
    container.dispatchEvent(pointerEvent('pointerdown', 500, 300));
    container.dispatchEvent(pointerEvent('pointermove', 600, 400));
    const moved = getTransform(svg);
    expect(moved.x).not.toBeCloseTo(fittedX, 5);

    pz.fit();
    expect(getTransform(svg).scale).toBeCloseTo(2 * 0.94, 5);
    expect(getTransform(svg).x).toBeCloseTo(fittedX, 5);
  });

  it('wheel zooms toward the cursor, not the container origin', () => {
    attachPanZoom(svg, container);
    const before = getTransform(svg);
    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 900, clientY: 500, deltaY: -100 });
    container.dispatchEvent(wheel);
    const after = getTransform(svg);
    expect(after.scale).toBeGreaterThan(before.scale);
    // zooming toward a point off-center should shift the translate, not just rescale in place
    expect(after.x).not.toBeCloseTo(before.x, 5);
  });

  it('drag pans the diagram', () => {
    attachPanZoom(svg, container);
    const before = getTransform(svg);
    container.dispatchEvent(pointerEvent('pointerdown', 100, 100));
    container.dispatchEvent(pointerEvent('pointermove', 150, 130));
    const after = getTransform(svg);
    expect(after.x - before.x).toBeCloseTo(50, 5);
    expect(after.y - before.y).toBeCloseTo(30, 5);
    container.dispatchEvent(pointerEvent('pointerup', 150, 130));
  });

  it('double-click zooms in at the click point', () => {
    attachPanZoom(svg, container);
    const before = getTransform(svg);
    const dbl = new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 400, clientY: 200 });
    container.dispatchEvent(dbl);
    expect(getTransform(svg).scale).toBeGreaterThan(before.scale);
  });

  it('respects minScale/maxScale', () => {
    const pz = attachPanZoom(svg, container, { minScale: 0.5, maxScale: 3 });
    for (let i = 0; i < 20; i++) pz.zoomOut();
    expect(pz.getScale()).toBeGreaterThanOrEqual(0.5);
    for (let i = 0; i < 20; i++) pz.zoomIn();
    expect(pz.getScale()).toBeLessThanOrEqual(3);
  });

  it('renders a control button cluster by default, and can opt out', () => {
    attachPanZoom(svg, container);
    expect(container.querySelectorAll('[data-d5-pan-zoom-controls] button')).toHaveLength(3);

    const { container: c2, svg: s2 } = setUp();
    attachPanZoom(s2, c2, { controls: false });
    expect(c2.querySelector('[data-d5-pan-zoom-controls]')).toBeNull();
  });

  it('renders a hint by default, can opt out or override the text', () => {
    attachPanZoom(svg, container);
    expect(container.textContent).toContain('Scroll to zoom');

    const { container: c2, svg: s2 } = setUp();
    attachPanZoom(s2, c2, { hint: false, controls: false });
    expect(c2.textContent?.trim()).toBe('');

    const { container: c3, svg: s3 } = setUp();
    attachPanZoom(s3, c3, { hint: 'custom hint', controls: false });
    expect(c3.textContent).toBe('custom hint');
  });

  it('destroy() removes the controls/hint and stops responding to input', () => {
    const pz = attachPanZoom(svg, container);
    const before = pz.getScale();
    pz.destroy();
    expect(container.querySelector('[data-d5-pan-zoom-controls]')).toBeNull();

    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 500, clientY: 300, deltaY: -100 });
    container.dispatchEvent(wheel);
    expect(getTransform(svg).scale).toBe(before);
  });

  // Regression test for a real bug caught by hand-testing in a browser: a pointerdown that
  // starts on a control button bubbles to the container, whose handler used to unconditionally
  // start a pan *and* call `setPointerCapture` — which retargets the browser's synthesized
  // `click` event away from the button, so the button's own click handler never runs (confirmed
  // via instrumented listeners: `click` fired with `target` = a `<div>`, not the `<button>`).
  // jsdom doesn't implement that retargeting to reproduce it exactly, so this asserts the
  // actual fix instead: a pointerdown that starts inside the controls must not engage panning.
  describe('regression: control-button clicks must not be swallowed by the pan handler', () => {
    it('a pointerdown on a zoom button does not start a pan (no transform change on subsequent move)', () => {
      attachPanZoom(svg, container);
      const button = container.querySelector('[data-d5-pan-zoom-controls] button') as HTMLButtonElement;
      const before = getTransform(svg);

      const r = button.getBoundingClientRect();
      button.dispatchEvent(pointerEvent('pointerdown', r.left + 1, r.top + 1));
      // If the container's pan logic had engaged, this move would translate the svg.
      container.dispatchEvent(pointerEvent('pointermove', r.left + 60, r.top + 60));

      expect(getTransform(svg)).toEqual(before);
    });

    it('clicking each control button still fires its own handler (zoom in / zoom out / fit)', () => {
      const pz = attachPanZoom(svg, container);
      const [zoomIn, zoomOut, fit] = Array.from(
        container.querySelectorAll('[data-d5-pan-zoom-controls] button'),
      ) as HTMLButtonElement[];

      const afterFit = pz.getScale();
      zoomIn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(pz.getScale()).toBeGreaterThan(afterFit);

      const afterZoomIn = pz.getScale();
      zoomOut.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(pz.getScale()).toBeLessThan(afterZoomIn);

      // move away from the fitted state, then confirm the fit button brings it back
      pz.zoomIn();
      expect(pz.getScale()).not.toBeCloseTo(afterFit, 5);
      fit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(pz.getScale()).toBeCloseTo(afterFit, 5);
    });

    it('a double-click on a control button does not also trigger the container double-click zoom', () => {
      attachPanZoom(svg, container);
      const button = container.querySelector('[data-d5-pan-zoom-controls] button') as HTMLButtonElement;
      const before = getTransform(svg);
      const r = button.getBoundingClientRect();
      const dbl = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: r.left + 1,
        clientY: r.top + 1,
      });
      button.dispatchEvent(dbl);
      // the container's own dblclick->zoomAt handler must have been skipped
      expect(getTransform(svg).scale).toBe(before.scale);
    });
  });

  // Regression test for a second real bug, same family as the one above, caught hand-testing
  // attachPanZoom composed with attachToggle on the same container (exactly what the example
  // pages do): unchecking a toggle-panel checkbox did nothing at all. Root cause: this
  // helper's pointerdown guard only recognised *its own* `[data-d5-pan-zoom-controls]`, so it
  // still captured the pointer for clicks on a *different* helper's overlay UI sharing the
  // container, swallowing them the same way. Fixed via a shared `data-d5-overlay` marker
  // (src/shared/overlay.ts) any attach*() helper's UI can carry, so this one doesn't need to
  // know the toggle panel (or any other overlay) exists by name.
  describe('regression: pan must also skip a *different* helper\'s overlay sharing the container', () => {
    it('a pointerdown on a foreign element marked data-d5-overlay does not start a pan', () => {
      attachPanZoom(svg, container);

      const foreignOverlay = document.createElement('div');
      foreignOverlay.setAttribute('data-d5-overlay', '');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      foreignOverlay.appendChild(checkbox);
      container.appendChild(foreignOverlay);

      const before = getTransform(svg);
      checkbox.dispatchEvent(pointerEvent('pointerdown', 10, 10));
      container.dispatchEvent(pointerEvent('pointermove', 80, 80));

      expect(getTransform(svg)).toEqual(before);
    });

    it('a click on that foreign overlay still reaches its own handler', () => {
      attachPanZoom(svg, container);

      const foreignOverlay = document.createElement('div');
      foreignOverlay.setAttribute('data-d5-overlay', '');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      let changed = false;
      checkbox.addEventListener('change', () => {
        changed = true;
      });
      foreignOverlay.appendChild(checkbox);
      container.appendChild(foreignOverlay);

      checkbox.dispatchEvent(pointerEvent('pointerdown', 10, 10));
      checkbox.dispatchEvent(pointerEvent('pointerup', 10, 10));
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));

      expect(changed).toBe(true);
    });
  });

  it('degrades quietly when setPointerCapture is unavailable (e.g. jsdom itself)', () => {
    // jsdom doesn't implement it at all — this just documents/asserts attach + drag don't throw.
    expect(typeof container.setPointerCapture).not.toBe('function');
    expect(() => {
      attachPanZoom(svg, container);
      container.dispatchEvent(pointerEvent('pointerdown', 10, 10));
      container.dispatchEvent(pointerEvent('pointermove', 20, 20));
      container.dispatchEvent(pointerEvent('pointerup', 20, 20));
    }).not.toThrow();
  });
});
