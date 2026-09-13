// Dependency-free "toggle components" for a rendered D5 diagram.
//
// Unlike `attachPanZoom` (a pure post-render DOM transform — never touches the parsed
// data), a toggle needs to change what's actually laid out: hiding a Domain should close
// the gap it leaves rather than just blank it out, and the DDD relationship-pattern
// styling, event/policy tags, etc. are all computed at render time. So this re-invokes the
// same parser-produced db + renderer pair on every toggle, through a small per-diagram-type
// `ToggleAdapter` that knows what the toggle-able units are and how to build a filtered,
// read-only view of the db with a set of them (and anything that referenced them) removed.

import { markOverlay } from './overlay.js';

const PANEL_ATTR = 'data-d5-toggle-panel';

export interface ToggleItem {
  /** The id authors gave this element in the D5 source (`Domain(id, ...)`, etc.). */
  id: string;
  label: string;
}

export interface ToggleAdapter<Db> {
  /** Enumerate the toggle-able units, in the order the checklist should list them. */
  items(db: Db): ToggleItem[];
  /**
   * Build a read-only db-shaped view with `hiddenIds` (and anything that referenced one of
   * them — a Rel, Event, Policy between a hidden unit and a visible one) removed. `db`
   * itself must not be mutated — the original stays the source of truth across toggles.
   */
  filter(db: Db, hiddenIds: ReadonlySet<string>): Db;
}

export interface ToggleOptions {
  /** Render the built-in checklist panel. Default true. */
  panel?: boolean;
  /** Heading text above the checklist. Default "Show". */
  panelTitle?: string;
  /** ids to start hidden (unchecked). Default: none — everything starts visible. */
  initiallyHidden?: Iterable<string>;
  /** Called after every re-render (initial included) a toggle causes. Useful for e.g.
   * re-fitting an `attachPanZoom` instance on the same svg, since the diagram's size can
   * change once hidden elements stop taking up space. */
  onChange?: (visibleIds: ReadonlySet<string>) => void;
}

export interface ToggleHandle {
  show(id: string): void;
  hide(id: string): void;
  toggle(id: string): void;
  isVisible(id: string): boolean;
  getHiddenIds(): ReadonlySet<string>;
  /** Removes the panel and its listeners. The svg is left showing whatever was last
   * rendered — this does not restore hidden elements. */
  destroy(): void;
}

/**
 * Generic engine behind `attachDomainToggle` / `attachSubdomainToggle` / etc. Only exported
 * for advanced use (a custom renderer, or a diagram type this package doesn't ship); those
 * four are the documented entry points for D5's own diagram types.
 */
export function attachToggle<Db>(
  svg: SVGSVGElement,
  db: Db,
  render: (db: Db, container: SVGSVGElement) => void,
  adapter: ToggleAdapter<Db>,
  containerArg: HTMLElement | null = svg.parentElement,
  options: ToggleOptions = {},
): ToggleHandle {
  if (!containerArg) {
    throw new Error('attachToggle: no container (svg has no parentElement and none was given)');
  }
  const container = containerArg;
  const withPanel = options.panel ?? true;
  const panelTitle = options.panelTitle ?? 'Show';

  const items = adapter.items(db);
  const hidden = new Set<string>(options.initiallyHidden ?? []);
  const checkboxes = new Map<string, HTMLInputElement>();

  function visibleIds(): Set<string> {
    return new Set(items.map((i) => i.id).filter((id) => !hidden.has(id)));
  }

  function rerender(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    render(adapter.filter(db, hidden), svg);
    options.onChange?.(visibleIds());
  }

  function setHidden(id: string, isHidden: boolean): void {
    if (isHidden) hidden.add(id);
    else hidden.delete(id);
    const checkbox = checkboxes.get(id);
    if (checkbox) checkbox.checked = !isHidden;
    rerender();
  }

  let panelEl: HTMLElement | null = null;

  if (withPanel && items.length > 0) {
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    panelEl = document.createElement('div');
    panelEl.setAttribute(PANEL_ATTR, '');
    markOverlay(panelEl);
    Object.assign(panelEl.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      zIndex: '10',
      maxHeight: 'calc(100% - 16px)',
      overflowY: 'auto',
      background: 'rgba(255,255,255,0.95)',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      padding: '6px 8px',
      font: '11px -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#334155',
    } as CSSStyleDeclaration);

    const heading = document.createElement('div');
    heading.textContent = panelTitle;
    Object.assign(heading.style, { fontWeight: '600', marginBottom: '4px' } as CSSStyleDeclaration);
    panelEl.appendChild(heading);

    items.forEach((item) => {
      const row = document.createElement('label');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 0',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      } as CSSStyleDeclaration);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !hidden.has(item.id);
      checkbox.addEventListener('change', () => setHidden(item.id, !checkbox.checked));
      checkboxes.set(item.id, checkbox);

      const text = document.createElement('span');
      text.textContent = item.label;

      row.appendChild(checkbox);
      row.appendChild(text);
      panelEl!.appendChild(row);
    });

    container.appendChild(panelEl);
  }

  rerender();

  return {
    show: (id) => setHidden(id, false),
    hide: (id) => setHidden(id, true),
    toggle: (id) => setHidden(id, !hidden.has(id)),
    isVisible: (id) => !hidden.has(id),
    getHiddenIds: () => new Set(hidden),
    destroy: () => {
      panelEl?.remove();
      checkboxes.clear();
    },
  };
}
