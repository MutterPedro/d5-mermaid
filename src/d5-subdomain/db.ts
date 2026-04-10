export type SubdomainType = 'core' | 'supporting' | 'generic';

interface Subdomain {
  id: string;
  label: string;
  type: SubdomainType;
}

interface BoundedContext {
  id: string;
  label: string;
  subdomainId: string;
  team: string | undefined;
}

interface Relationship {
  source: string;
  target: string;
  label: string;
}

export class D5SubdomainDb {
  private subdomains: Subdomain[] = [];
  private boundedContexts: BoundedContext[] = [];
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
