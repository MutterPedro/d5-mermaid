import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attachExport,
  buildExportSvg,
  computeExportSize,
  downloadPng,
  exportPng,
} from '../src/shared/export-image.js';
import { OVERLAY_ATTR } from '../src/shared/overlay.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeSvg(vbW = 500, vbH = 300): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('width', '100%');
  const title = document.createElementNS(SVG_NS, 'text');
  title.setAttribute('class', 'd5-title');
  title.textContent = 'Order Management!';
  svg.appendChild(title);
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('fill', '#abcdef');
  svg.appendChild(rect);
  return svg;
}

/** jsdom can neither decode an SVG <img> nor draw on a <canvas> — stand both in. */
function stubRasterizer() {
  const ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
  const blob = new Blob(['png'], { type: 'image/png' });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(blob));
  let loadedSrc = '';
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      loadedSrc = value;
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal('Image', FakeImage);
  return { ctx, blob, loadedSrc: () => loadedSrc };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('computeExportSize', () => {
  it('uses the requested scale when it fits the caps', () => {
    expect(computeExportSize(500, 300, { scale: 4 })).toEqual({ width: 2000, height: 1200, scale: 4 });
  });

  it('defaults to a 4x scale', () => {
    expect(computeExportSize(500, 300).scale).toBe(4);
  });

  it('lowers the scale so the longest side stays within maxDimension', () => {
    const size = computeExportSize(10000, 1000, { scale: 4, maxDimension: 16384 });
    expect(size.width).toBe(16384);
    expect(size.height).toBe(1638);
  });

  it('lowers the scale so the total pixel count stays within maxPixels', () => {
    const size = computeExportSize(4000, 4000, { scale: 4, maxPixels: 16_777_216 });
    expect(size.width * size.height).toBeLessThanOrEqual(16_777_216);
    expect(size.scale).toBeCloseTo(Math.sqrt(16_777_216 / (4000 * 4000)), 5);
  });

  it('never returns a zero-sized image', () => {
    expect(computeExportSize(1, 1, { scale: 0.0001 })).toMatchObject({ width: 1, height: 1 });
  });
});

describe('buildExportSvg', () => {
  it('sizes the output from the viewBox (plus padding), not the width="100%" attribute', () => {
    const { markup, width, height } = buildExportSvg(makeSvg(500, 300), { scale: 2, padding: 10 });
    expect(width).toBe(1040); // (500 + 20) * 2
    expect(height).toBe(640); // (300 + 20) * 2
    expect(markup).toContain('width="1040"');
    expect(markup).toContain('height="640"');
    expect(markup).toContain('viewBox="-10 -10 520 320"');
  });

  it('drops the pan/zoom transform and max-width so the whole diagram is captured at rest', () => {
    const svg = makeSvg();
    svg.style.transform = 'translate(40px, 20px) scale(3)';
    svg.style.transformOrigin = '0 0';
    svg.style.maxWidth = '500px';
    const { markup } = buildExportSvg(svg);
    expect(markup).not.toContain('scale(3)');
    expect(markup).not.toContain('transform-origin');
    expect(markup).not.toContain('max-width');
  });

  it('does not mutate the live svg', () => {
    const svg = makeSvg();
    svg.style.transform = 'translate(1px, 2px) scale(2)';
    const before = svg.outerHTML;
    buildExportSvg(svg);
    expect(svg.outerHTML).toBe(before);
  });

  it('bakes resolved styles from the page stylesheet into the output', () => {
    const style = document.createElement('style');
    style.textContent = '.d5-title { font-size: 21px; fill: rgb(1, 2, 3); }';
    document.head.appendChild(style);
    const svg = makeSvg();
    document.body.appendChild(svg);
    const { markup } = buildExportSvg(svg);
    expect(markup).toContain('font-size: 21px');
    expect(markup).toContain('fill: rgb(1, 2, 3)');
    style.remove();
  });

  it('declares the SVG namespace so it loads as a standalone image', () => {
    expect(buildExportSvg(makeSvg()).markup).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('throws a clear error when there is no viewBox to size from', () => {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    expect(() => buildExportSvg(svg)).toThrow(/viewBox/);
  });
});

describe('exportPng', () => {
  it('rasterizes onto a canvas of the output size and resolves with the png blob', async () => {
    const { ctx, blob, loadedSrc } = stubRasterizer();
    const out = await exportPng(makeSvg(500, 300), { scale: 2, padding: 0 });
    expect(out).toBe(blob);
    expect(loadedSrc()).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1000, 600);
  });

  it('paints a white background by default', async () => {
    const { ctx } = stubRasterizer();
    await exportPng(makeSvg());
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('leaves the background untouched for "transparent"', async () => {
    const { ctx } = stubRasterizer();
    await exportPng(makeSvg(), { background: 'transparent' });
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('rejects when the browser cannot rasterize the svg', async () => {
    stubRasterizer();
    class BrokenImage {
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal('Image', BrokenImage);
    await expect(exportPng(makeSvg())).rejects.toThrow(/rasterize/);
  });

  it('rejects when the canvas cannot be encoded (too large for the browser)', async () => {
    stubRasterizer();
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(null));
    await expect(exportPng(makeSvg())).rejects.toThrow(/encoded/);
  });
});

describe('downloadPng', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  function captureDownloadName(): { name: () => string | undefined } {
    let name: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download;
    });
    return { name: () => name };
  }

  it('names the file after the diagram title', async () => {
    stubRasterizer();
    const dl = captureDownloadName();
    await downloadPng(makeSvg());
    expect(dl.name()).toBe('order-management.png');
  });

  it('falls back to a generic name when the diagram has no title', async () => {
    stubRasterizer();
    const dl = captureDownloadName();
    const svg = makeSvg();
    svg.querySelector('.d5-title')!.remove();
    await downloadPng(svg);
    expect(dl.name()).toBe('d5-diagram.png');
  });

  it('honors an explicit filename, adding .png only when missing', async () => {
    stubRasterizer();
    const dl = captureDownloadName();
    await downloadPng(makeSvg(), { filename: 'mine' });
    expect(dl.name()).toBe('mine.png');
    await downloadPng(makeSvg(), { filename: 'other.PNG' });
    expect(dl.name()).toBe('other.PNG');
  });
});

describe('attachExport', () => {
  let container: HTMLDivElement;
  let svg: SVGSVGElement;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    container = document.createElement('div');
    svg = makeSvg();
    container.appendChild(svg);
    document.body.appendChild(container);
  });

  it('adds a button marked as overlay UI, so a shared attachPanZoom ignores its clicks', () => {
    attachExport(svg, container);
    const button = container.querySelector('button')!;
    expect(button).not.toBeNull();
    expect(button.hasAttribute(OVERLAY_ATTR)).toBe(true);
  });

  it('downloads a png and reports it through onExport when clicked', async () => {
    const { blob } = stubRasterizer();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const onExport = vi.fn();
    attachExport(svg, container, { onExport });
    container.querySelector('button')!.click();
    await vi.waitFor(() => expect(onExport).toHaveBeenCalledWith(blob));
    expect(container.querySelector('button')!.disabled).toBe(false);
  });

  // Regression: `onExport?.(await download())` skipped the download whenever onExport was unset.
  it('downloads on click even when no onExport callback is given', async () => {
    stubRasterizer();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    attachExport(svg, container);
    container.querySelector('button')!.click();
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
  });

  it('reports failures through onError and re-enables the button', async () => {
    stubRasterizer();
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(null));
    const onError = vi.fn();
    attachExport(svg, container, { onError });
    const button = container.querySelector('button')!;
    button.click();
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(button.disabled).toBe(false);
  });

  it('exposes toBlob() without downloading', async () => {
    const { blob } = stubRasterizer();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const handle = attachExport(svg, container);
    expect(await handle.toBlob()).toBe(blob);
    expect(click).not.toHaveBeenCalled();
  });

  it('removes the button on destroy()', () => {
    const handle = attachExport(svg, container);
    handle.destroy();
    expect(container.querySelector('button')).toBeNull();
  });

  it('throws when there is no container', () => {
    expect(() => attachExport(makeSvg())).toThrow(/no container/);
  });
});
