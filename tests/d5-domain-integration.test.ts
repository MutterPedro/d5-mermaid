import { describe, it, expect } from 'vitest';
import { d5Diagrams } from '../src/index.js';

describe('d5 mermaid integration', () => {
  it('exports an array of ExternalDiagramDefinition objects', () => {
    expect(Array.isArray(d5Diagrams)).toBe(true);
    expect(d5Diagrams.length).toBeGreaterThanOrEqual(1);
  });

  it('includes d5-domain diagram definition', () => {
    const domainDef = d5Diagrams.find(d => d.id === 'd5-domain');
    expect(domainDef).toBeDefined();
    expect(typeof domainDef!.detector).toBe('function');
    expect(typeof domainDef!.loader).toBe('function');
  });

  it('d5-domain detector identifies correct text', () => {
    const domainDef = d5Diagrams.find(d => d.id === 'd5-domain')!;
    expect(domainDef.detector('d5-domain\n  title X')).toBe(true);
    expect(domainDef.detector('flowchart LR\n  A --> B')).toBe(false);
  });

  it('d5-domain loader returns a valid DiagramDefinition', async () => {
    const domainDef = d5Diagrams.find(d => d.id === 'd5-domain')!;
    const result = await domainDef.loader();

    expect(result.id).toBe('d5-domain');
    expect(result.diagram).toBeDefined();
    expect(result.diagram.db).toBeDefined();
    expect(typeof result.diagram.db.clear).toBe('function');
    expect(result.diagram.parser).toBeDefined();
    expect(typeof result.diagram.parser.parse).toBe('function');
    expect(result.diagram.renderer).toBeDefined();
    expect(typeof result.diagram.renderer.draw).toBe('function');
  });

  it('d5-domain parser populates db when called', async () => {
    const domainDef = d5Diagrams.find(d => d.id === 'd5-domain')!;
    const { diagram } = await domainDef.loader();

    diagram.db.clear!();
    diagram.parser.parse(`d5-domain
  title Test
  Domain(acme, "ACME") {
    Subdomain(s1, "Sub One", core)
  }
`);

    expect(diagram.db.getDiagramTitle!()).toBe('Test');
  });

  it('exports all 4 diagram types', () => {
    expect(d5Diagrams).toHaveLength(4);
    const ids = d5Diagrams.map(d => d.id);
    expect(ids).toContain('d5-domain');
    expect(ids).toContain('d5-subdomain');
    expect(ids).toContain('d5-context');
    expect(ids).toContain('d5-aggregate');
  });

  it.each([
    ['d5-subdomain', 'd5-subdomain\n  title X'],
    ['d5-context', 'd5-context\n  title X'],
    ['d5-aggregate', 'd5-aggregate\n  title X'],
  ])('%s detector identifies correct text', (id, text) => {
    const def = d5Diagrams.find(d => d.id === id)!;
    expect(def).toBeDefined();
    expect(def.detector(text)).toBe(true);
    expect(def.detector('flowchart LR\n  A --> B')).toBe(false);
  });

  it.each(['d5-subdomain', 'd5-context', 'd5-aggregate'])(
    '%s loader returns a valid DiagramDefinition',
    async (id) => {
      const def = d5Diagrams.find(d => d.id === id)!;
      const result = await def.loader();

      expect(result.id).toBe(id);
      expect(result.diagram.db).toBeDefined();
      expect(typeof result.diagram.db.clear).toBe('function');
      expect(typeof result.diagram.parser.parse).toBe('function');
      expect(typeof result.diagram.renderer.draw).toBe('function');
    },
  );
});
