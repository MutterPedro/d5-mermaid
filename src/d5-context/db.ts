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

interface Term {
  term: string;
  definition: string;
}

interface Relationship {
  source: string;
  target: string;
  label: string;
}

export class D5ContextDb {
  private boundedContext: BoundedContext | undefined;
  private aggregates: Aggregate[] = [];
  private terms: Term[] = [];
  private relationships: Relationship[] = [];
  private title: string | undefined;
  private accTitle: string | undefined;
  private accDescription: string | undefined;

  setTitle(title: string): void {
    this.title = title;
  }

  getTitle(): string | undefined {
    return this.title;
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

  clear(): void {
    this.boundedContext = undefined;
    this.aggregates = [];
    this.terms = [];
    this.relationships = [];
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
