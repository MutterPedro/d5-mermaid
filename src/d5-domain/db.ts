export type SubdomainType = 'core' | 'supporting' | 'generic';

interface Domain {
  id: string;
  label: string;
}

interface Subdomain {
  id: string;
  label: string;
  type: SubdomainType;
}

interface Relationship {
  source: string;
  target: string;
  label: string;
}

export class D5DomainDb {
  private domain: Domain | undefined;
  private subdomains: Subdomain[] = [];
  private relationships: Relationship[] = [];
  private title: string | undefined;
  private accTitle: string | undefined;
  private accDescription: string | undefined;

  getDomain(): Domain | undefined {
    return this.domain;
  }

  setDomain(id: string, label: string): void {
    this.domain = { id, label };
  }

  getSubdomains(): Subdomain[] {
    return this.subdomains;
  }

  addSubdomain(id: string, label: string, type: SubdomainType): void {
    this.subdomains.push({ id, label, type });
  }

  getRelationships(): Relationship[] {
    return this.relationships;
  }

  addRelationship(source: string, target: string, label: string): void {
    this.relationships.push({ source, target, label });
  }

  clear(): void {
    this.domain = undefined;
    this.subdomains = [];
    this.relationships = [];
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
