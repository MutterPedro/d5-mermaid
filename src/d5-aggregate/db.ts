interface Aggregate {
  id: string;
  label: string;
  root: string;
}

interface Entity {
  id: string;
  label: string;
}

interface ValueObject {
  id: string;
  label: string;
}

export class D5AggregateDb {
  private aggregate: Aggregate | undefined;
  private entities: Entity[] = [];
  private valueObjects: ValueObject[] = [];
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

  clear(): void {
    this.aggregate = undefined;
    this.entities = [];
    this.valueObjects = [];
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
