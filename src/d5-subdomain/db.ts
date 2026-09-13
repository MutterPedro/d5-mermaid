import { type Direction, normalizeDirection } from '../shared/direction.js';

export type SubdomainType = 'core' | 'supporting' | 'generic';

/** Context-map layout flow; `LR` matches the upstream→downstream convention. */
const DEFAULT_DIRECTION: Direction = 'LR';

export interface Subdomain {
  id: string;
  label: string;
  type: SubdomainType;
}

export interface BoundedContext {
  id: string;
  label: string;
  subdomainId: string;
  team: string | undefined;
}

export interface Relationship {
  source: string;
  target: string;
  label: string;
}

/**
 * The subset of `D5SubdomainDb` the renderer actually reads. Kept separate from the class
 * so a filtered, read-only view (e.g. `attachSubdomainToggle`'s hidden-subdomain facade)
 * can satisfy it with a plain object — a class with private fields can't be structurally
 * matched by one.
 */
export interface D5SubdomainReadable {
  getTitle(): string | undefined;
  getSubdomains(): Subdomain[];
  getBoundedContexts(): BoundedContext[];
  getRelationships(): Relationship[];
  getDirection(): Direction;
}

export class D5SubdomainDb implements D5SubdomainReadable {
  private subdomains: Subdomain[] = [];
  private boundedContexts: BoundedContext[] = [];
  private relationships: Relationship[] = [];
  private direction: Direction = DEFAULT_DIRECTION;
  private title: string | undefined;
  private accTitle: string | undefined;
  private accDescription: string | undefined;

  setTitle(title: string): void {
    this.title = title;
  }

  getTitle(): string | undefined {
    return this.title;
  }

  /** Accepts `LR` / `RL` / `TB` / `TD` / `BT` (case-insensitive); `TD` is stored as `TB`. */
  setDirection(dir: string): void {
    const normalized = normalizeDirection(dir);
    if (normalized) this.direction = normalized;
  }

  getDirection(): Direction {
    return this.direction;
  }

  addSubdomain(id: string, label: string, type: SubdomainType): void {
    this.subdomains.push({ id, label, type });
  }

  getSubdomains(): Subdomain[] {
    return this.subdomains;
  }

  addBoundedContext(id: string, label: string, subdomainId: string, team?: string): void {
    this.boundedContexts.push({ id, label, subdomainId, team });
  }

  getBoundedContexts(): BoundedContext[] {
    return this.boundedContexts;
  }

  addRelationship(source: string, target: string, label: string): void {
    this.relationships.push({ source, target, label });
  }

  getRelationships(): Relationship[] {
    return this.relationships;
  }

  clear(): void {
    this.subdomains = [];
    this.boundedContexts = [];
    this.relationships = [];
    this.direction = DEFAULT_DIRECTION;
    this.title = undefined;
    this.accTitle = undefined;
    this.accDescription = undefined;
  }

  // Mermaid DiagramDB interface methods

  setDiagramTitle(title: string): void {
    this.setTitle(title);
  }

  getDiagramTitle(): string {
    return this.title ?? '';
  }

  setAccTitle(title: string): void {
    this.accTitle = title;
  }

  getAccTitle(): string {
    return this.accTitle ?? '';
  }

  setAccDescription(desc: string): void {
    this.accDescription = desc;
  }

  getAccDescription(): string {
    return this.accDescription ?? '';
  }
}
