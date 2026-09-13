import { type Direction, normalizeDirection } from '../shared/direction.js';

export type SubdomainType = 'core' | 'supporting' | 'generic';

const DEFAULT_DIRECTION: Direction = 'TB';

export interface Domain {
  id: string;
  label: string;
}

export interface Subdomain {
  id: string;
  label: string;
  type: SubdomainType;
  /** Which `Domain(...)` block this subdomain was declared in. */
  domainId: string;
}

export interface Relationship {
  source: string;
  target: string;
  label: string;
}

/**
 * The subset of `D5DomainDb` the renderer actually reads. Kept separate from the class so
 * that a filtered, read-only view (e.g. `attachDomainToggle`'s hidden-domain facade) can
 * satisfy it with a plain object — a class with private fields can't be structurally
 * matched by one.
 */
export interface D5DomainReadable {
  getDomains(): Domain[];
  getSubdomains(): Subdomain[];
  getRelationships(): Relationship[];
  getDirection(): Direction;
  getTitle(): string | undefined;
}

export class D5DomainDb implements D5DomainReadable {
  private domains: Domain[] = [];
  private subdomains: Subdomain[] = [];
  private relationships: Relationship[] = [];
  private direction: Direction = DEFAULT_DIRECTION;
  private title: string | undefined;
  private accTitle: string | undefined;
  private accDescription: string | undefined;

  /**
   * One or more `Domain(...) { ... }` blocks, in declaration order. A diagram most often
   * has one, but multiple top-level domains are supported — e.g. to show a strategic
   * dependency between two otherwise-separate businesses on one canvas.
   */
  getDomains(): Domain[] {
    return this.domains;
  }

  addDomain(id: string, label: string): void {
    this.domains.push({ id, label });
  }

  getSubdomains(): Subdomain[] {
    return this.subdomains;
  }

  addSubdomain(id: string, label: string, type: SubdomainType, domainId: string): void {
    this.subdomains.push({ id, label, type, domainId });
  }

  getRelationships(): Relationship[] {
    return this.relationships;
  }

  addRelationship(source: string, target: string, label: string): void {
    this.relationships.push({ source, target, label });
  }

  /** Accepts `LR` / `RL` / `TB` / `TD` / `BT` (case-insensitive); `TD` is stored as `TB`. */
  setDirection(dir: string): void {
    const normalized = normalizeDirection(dir);
    if (normalized) this.direction = normalized;
  }

  getDirection(): Direction {
    return this.direction;
  }

  clear(): void {
    this.domains = [];
    this.subdomains = [];
    this.relationships = [];
    this.direction = DEFAULT_DIRECTION;
    this.title = undefined;
    this.accTitle = undefined;
    this.accDescription = undefined;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  getTitle(): string | undefined {
    return this.title;
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
