import { describe, it, expect } from 'vitest';
import { markOverlay, isOverlayEvent, OVERLAY_ATTR } from '../src/shared/overlay.js';

describe('markOverlay / isOverlayEvent', () => {
  it('marks an element with the shared overlay attribute', () => {
    const el = document.createElement('div');
    markOverlay(el);
    expect(el.hasAttribute(OVERLAY_ATTR)).toBe(true);
  });

  it('recognises an event whose target is the marked element itself', () => {
    const el = document.createElement('div');
    markOverlay(el);
    const evt = { target: el } as unknown as Event;
    expect(isOverlayEvent(evt)).toBe(true);
  });

  it('recognises an event whose target is a descendant of a marked element', () => {
    const el = document.createElement('div');
    markOverlay(el);
    const child = document.createElement('button');
    el.appendChild(child);
    const evt = { target: child } as unknown as Event;
    expect(isOverlayEvent(evt)).toBe(true);
  });

  it('returns false for an event outside any marked element', () => {
    const el = document.createElement('div');
    const evt = { target: el } as unknown as Event;
    expect(isOverlayEvent(evt)).toBe(false);
  });

  it('returns false when the event has no target', () => {
    const evt = { target: null } as unknown as Event;
    expect(isOverlayEvent(evt)).toBe(false);
  });
});
