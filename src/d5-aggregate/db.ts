export interface Aggregate {
  id: string;
  label: string;
  root: string;
}

export interface Entity {
  id: string;
  label: string;
}

export interface ValueObject {
  id: string;
  label: string;
}

export interface Invariant {
  /** optional short name / subject */
  name: string | undefined;
  /** the rule statement */
  text: string;
}

/**
 * The subset of `D5AggregateDb` the renderer actually reads. Kept separate from the class
 * so a filtered, read-only view (e.g. `attachAggregateToggle`'s hidden-member facade) can
 * satisfy it with a plain object — a class with private fields can't be structurally
 * matched by one.
 */
export interface D5AggregateReadable {
  getTitle(): string | undefined;
  getAggregate(): Aggregate | undefined;
  getEntities(): Entity[];
  getValueObjects(): ValueObject[];
  getInvariants(): Invariant[];
}

export class D5AggregateDb implements D5AggregateReadable {
  private aggregate: Aggregate | undefined;
  private entities: Entity[] = [];
  private valueObjects: ValueObject[] = [];
  private invariants: Invariant[] = [];
  private title: string | undefined;
  private accTitle: string | undefined;
  private accDescription: string | undefined;

  getAggregate(): Aggregate | undefined {
    return this.aggregate;
  }

  setAggregate(id: string, label: string, root: string): void {
    this.aggregate = { id, label, root };
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  addEntity(id: string, label: string): void {
    this.entities.push({ id, label });
  }

  getValueObjects(): ValueObject[] {
    return this.valueObjects;
  }

  addValueObject(id: string, label: string): void {
    this.valueObjects.push({ id, label });
  }

  getInvariants(): Invariant[] {
    return this.invariants;
  }

  addInvariant(text: string, name?: string): void {
    this.invariants.push({ name: name || undefined, text });
  }

  clear(): void {
    this.aggregate = undefined;
    this.entities = [];
    this.valueObjects = [];
    this.invariants = [];
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
