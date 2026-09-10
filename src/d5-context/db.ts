import { type Direction, normalizeDirection } from '../shared/direction.js';

const DEFAULT_DIRECTION: Direction = 'TB';

interface BoundedContext {
  id: string;
  label: string;
  team: string | undefined;
}

interface Aggregate {
  id: string;
  label: string;
  root: string;
  fields?: string[];
}

/** A denormalised query-side view built from domain events (CQRS read model). */
interface ReadModel {
  id: string;
  label: string;
}

interface Term {
  term: string;
  definition: string;
}

interface Relationship {
  source: string;
  target: string;
  label: string;
}

/** A domain event flowing from one aggregate to another: `source` emits, `target` reacts. */
interface DomainEvent {
  source: string;
  target: string;
  name: string;
}

/**
 * A reactive policy ("whenever … then …"). `source` is the aggregate whose activity
 * triggers it, `target` the aggregate that reacts (they may be the same for a
 * scheduled / self-directed policy). `rule` is the free-text statement.
 */
interface Policy {
  source: string;
  target: string;
  rule: string;
}

export class D5ContextDb {
  private boundedContext: BoundedContext | undefined;
  private aggregates: Aggregate[] = [];
  private readModels: ReadModel[] = [];
  private terms: Term[] = [];
  private relationships: Relationship[] = [];
  private events: DomainEvent[] = [];
  private policies: Policy[] = [];
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

  setBoundedContext(id: string, label: string, team?: string): void {
    this.boundedContext = { id, label, team };
  }

  getBoundedContext(): BoundedContext | undefined {
    return this.boundedContext;
  }

  addAggregate(id: string, label: string, root: string, fields?: string[]): void {
    this.aggregates.push({ id, label, root, fields });
  }

  getAggregates(): Aggregate[] {
    return this.aggregates;
  }

  addReadModel(id: string, label: string): void {
    this.readModels.push({ id, label });
  }

  getReadModels(): ReadModel[] {
    return this.readModels;
  }

  addTerm(term: string, definition: string): void {
    this.terms.push({ term, definition });
  }

  getTerms(): Term[] {
    return this.terms;
  }

  addRelationship(source: string, target: string, label: string): void {
    this.relationships.push({ source, target, label });
  }

  getRelationships(): Relationship[] {
    return this.relationships;
  }

  addEvent(source: string, target: string, name: string): void {
    this.events.push({ source, target, name });
  }

  getEvents(): DomainEvent[] {
    return this.events;
  }

  addPolicy(source: string, target: string, rule: string): void {
    this.policies.push({ source, target, rule });
  }

  getPolicies(): Policy[] {
    return this.policies;
  }

  clear(): void {
    this.boundedContext = undefined;
    this.aggregates = [];
    this.readModels = [];
    this.terms = [];
    this.relationships = [];
    this.events = [];
    this.policies = [];
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
