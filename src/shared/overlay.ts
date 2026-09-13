// Shared marker for "this element is interactive overlay UI (a control cluster, a
// checklist, ...) on top of the diagram — not part of the pannable/draggable surface
// itself". `attachPanZoom` and `attachToggle` can both be pointed at the same container
// (exactly what the example pages do), and a pointerdown that starts on one helper's
// overlay must not be swallowed by another helper's drag/pan logic on that shared
// container — confirmed live: unchecking a toggle-panel checkbox did nothing at all,
// because attachPanZoom's own pointerdown handler (which didn't know the checklist
// existed) captured the pointer first. Tagging every overlay with this one attribute lets
// each helper skip *any* overlay without the helpers needing to know about each other.

export const OVERLAY_ATTR = 'data-d5-overlay';

export function markOverlay(el: HTMLElement): void {
  el.setAttribute(OVERLAY_ATTR, '');
}

export function isOverlayEvent(e: Event): boolean {
  const target = e.target as Element | null;
  return !!target?.closest(`[${OVERLAY_ATTR}]`);
}
