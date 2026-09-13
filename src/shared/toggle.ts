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
  /**
   * The item's parent in the D5 source (a Subdomain's owning Domain, a Bounded Context's
   * owning Subdomain, ...), when the toggle unit sits one level under a container that can
   * itself repeat. Items are grouped under this label in the checklist — but only once
   * there's more than one distinct group; a single group renders flat, since a heading
   * naming the one thing everything already belongs to adds nothing.
   */
  group?: string;
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
  /** Start the checklist collapsed (only the heading shown). Default false. */
  collapsed?: boolean;
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
  const groupCheckboxes = new Map<string, HTMLInputElement>();
  let collapsed = options.collapsed ?? false;

  function visibleIds(): Set<string> {
    return new Set(items.map((i) => i.id).filter((id) => !hidden.has(id)));
  }

  function rerender(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    render(adapter.filter(db, hidden), svg);
    options.onChange?.(visibleIds());
  }

  /** Reflects `hidden` onto every group checkbox: fully checked when none of its items are
   * hidden, unchecked when all are, indeterminate in between. */
  function syncGroupCheckboxes(): void {
    groupCheckboxes.forEach((checkbox, group) => {
      const groupItems = items.filter((i) => i.group === group);
      const hiddenCount = groupItems.filter((i) => hidden.has(i.id)).length;
      checkbox.checked = hiddenCount === 0;
      checkbox.indeterminate = hiddenCount > 0 && hiddenCount < groupItems.length;
    });
  }

  function setHidden(id: string, isHidden: boolean): void {
    if (isHidden) hidden.add(id);
    else hidden.delete(id);
    const checkbox = checkboxes.get(id);
    if (checkbox) checkbox.checked = !isHidden;
    syncGroupCheckboxes();
    rerender();
  }

  /** Show or hide every item in one group at once, from its own checkbox. */
  function setGroupHidden(group: string, isHidden: boolean): void {
    items
      .filter((item) => item.group === group)
      .forEach((item) => {
        if (isHidden) hidden.add(item.id);
        else hidden.delete(item.id);
        const checkbox = checkboxes.get(item.id);
        if (checkbox) checkbox.checked = !isHidden;
      });
    syncGroupCheckboxes();
    rerender();
  }

  let panelEl: HTMLElement | null = null;
  let bodyEl: HTMLElement | null = null;
  let chevronEl: HTMLElement | null = null;

  function setCollapsed(next: boolean): void {
    collapsed = next;
    if (bodyEl) bodyEl.hidden = collapsed;
    if (chevronEl) chevronEl.textContent = collapsed ? '▸' : '▾';
  }

  function addRow(parent: HTMLElement, item: ToggleItem, indent = false): void {
    const row = document.createElement('label');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '2px 0',
      paddingLeft: indent ? '16px' : '0',
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
    parent.appendChild(row);
  }

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
      maxWidth: '220px',
      overflowY: 'auto',
      background: 'rgba(255,255,255,0.95)',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      padding: '6px 8px',
      font: '11px -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#334155',
    } as CSSStyleDeclaration);

    const heading = document.createElement('div');
    Object.assign(heading.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: '600',
      cursor: 'pointer',
      userSelect: 'none',
    } as CSSStyleDeclaration);

    chevronEl = document.createElement('span');
    const headingText = document.createElement('span');
    headingText.textContent = panelTitle;
    heading.appendChild(chevronEl);
    heading.appendChild(headingText);
    heading.addEventListener('click', () => setCollapsed(!collapsed));
    panelEl.appendChild(heading);

    bodyEl = document.createElement('div');
    bodyEl.style.marginTop = '4px';
    panelEl.appendChild(bodyEl);

    // Group items only when there's more than one distinct group — a single group (or no
    // items carrying one at all) renders as the flat list it always has.
    const groups: string[] = [];
    items.forEach((item) => {
      if (item.group !== undefined && !groups.includes(item.group)) groups.push(item.group);
    });
    const useGroups = groups.length > 1;

    if (useGroups) {
      groups.forEach((group) => {
        const groupRow = document.createElement('label');
        Object.assign(groupRow.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          marginTop: '6px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        } as CSSStyleDeclaration);

        const groupCheckbox = document.createElement('input');
        groupCheckbox.type = 'checkbox';
        groupCheckbox.addEventListener('change', () => setGroupHidden(group, !groupCheckbox.checked));
        groupCheckboxes.set(group, groupCheckbox);

        const groupText = document.createElement('span');
        groupText.textContent = group;
        Object.assign(groupText.style, {
          fontWeight: '600',
          color: '#64748b',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        } as CSSStyleDeclaration);

        groupRow.appendChild(groupCheckbox);
        groupRow.appendChild(groupText);
        bodyEl!.appendChild(groupRow);
        items.filter((item) => item.group === group).forEach((item) => addRow(bodyEl!, item, true));
      });
      syncGroupCheckboxes();
      // items with no group (shouldn't normally happen once any item declares one, but
      // don't silently drop them if it does) render after the grouped ones, flat.
      items.filter((item) => item.group === undefined).forEach((item) => addRow(bodyEl!, item));
    } else {
      items.forEach((item) => addRow(bodyEl!, item));
    }

    setCollapsed(collapsed);
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
      groupCheckboxes.clear();
    },
  };
}
