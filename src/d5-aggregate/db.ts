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

export const MULTIPLICITIES = ['one', 'optional', 'many', 'at_least_one'] as const;
/** How many of the part an owner holds (or of the target a member references). */
export type Multiplicity = (typeof MULTIPLICITIES)[number];

/** Ownership inside the boundary: `owner` holds `part` directly, as `role`. */
export interface Has {
  owner: string;
  part: string;
  multiplicity: Multiplicity;
  role: string | undefined;
}

/** A reference out of the boundary: `source` holds the identity of another aggregate. */
export interface Ref {
  source: string;
  target: string;
  multiplicity: Multiplicity;
  role: string | undefined;
}

/** A command the aggregate handles. */
export interface Command {
  id: string;
  label: string;
}

/** A domain event the aggregate emits. */
export interface DomainEvent {
  id: string;
  label: string;
}

/** Handling `command` emits `event`. */
export interface Emits {
  command: string;
  event: string;
}

/** A state in the aggregate's lifecycle. The first one declared is the initial state. */
export interface State {
  id: string;
  label: string;
}

export interface Transition {
  from: string;
  to: string;
  /** id of the `Command` that causes it, when stated */
  on: string | undefined;
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
  getHas(): Has[];
  getRefs(): Ref[];
  /** Other aggregates, declared outside the subject's block, that `Ref`s point at. */
  getNeighbours(): Aggregate[];
  getCommands(): Command[];
  getEvents(): DomainEvent[];
  getEmits(): Emits[];
  getStates(): State[];
  getTransitions(): Transition[];
}

export class D5AggregateDb implements D5AggregateReadable {
  private aggregate: Aggregate | undefined;
  private entities: Entity[] = [];
  private valueObjects: ValueObject[] = [];
  private invariants: Invariant[] = [];
  private has: Has[] = [];
  private refs: Ref[] = [];
  private neighbours: Aggregate[] = [];
  private commands: Command[] = [];
  private events: DomainEvent[] = [];
  private emits: Emits[] = [];
  private states: State[] = [];
  private transitions: Transition[] = [];
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

  getHas(): Has[] {
    return this.has;
  }

  addHas(owner: string, part: string, multiplicity: Multiplicity = 'one', role?: string): void {
    this.has.push({ owner, part, multiplicity, role: role || undefined });
  }

  getRefs(): Ref[] {
    return this.refs;
  }

  addRef(source: string, target: string, multiplicity: Multiplicity = 'one', role?: string): void {
    this.refs.push({ source, target, multiplicity, role: role || undefined });
  }

  getNeighbours(): Aggregate[] {
    return this.neighbours;
  }

  addNeighbour(id: string, label: string, root: string): void {
    this.neighbours.push({ id, label, root });
  }

  getCommands(): Command[] {
    return this.commands;
  }

  addCommand(id: string, label: string): void {
    this.commands.push({ id, label });
  }

  getEvents(): DomainEvent[] {
    return this.events;
  }

  addEvent(id: string, label: string): void {
    this.events.push({ id, label });
  }

  getEmits(): Emits[] {
    return this.emits;
  }

  addEmits(command: string, event: string): void {
    this.emits.push({ command, event });
  }

  getStates(): State[] {
    return this.states;
  }

  addState(id: string, label: string): void {
    this.states.push({ id, label });
  }

  getTransitions(): Transition[] {
    return this.transitions;
  }

  addTransition(from: string, to: string, on?: string): void {
    this.transitions.push({ from, to, on: on || undefined });
  }

  clear(): void {
    this.aggregate = undefined;
    this.entities = [];
    this.valueObjects = [];
    this.invariants = [];
    this.has = [];
    this.refs = [];
    this.neighbours = [];
    this.commands = [];
    this.events = [];
    this.emits = [];
    this.states = [];
    this.transitions = [];
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
