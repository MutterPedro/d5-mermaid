import { describe, it, expect } from 'vitest';
import { classifyRelationship } from '../src/shared/context-relationship.js';

describe('classifyRelationship', () => {
  it('matches canonical names, abbreviations and spelling variants', () => {
    expect(classifyRelationship('Anti-Corruption Layer')?.name).toBe('Anti-Corruption Layer');
    expect(classifyRelationship('ACL')?.name).toBe('Anti-Corruption Layer');
    expect(classifyRelationship('anticorruption')?.name).toBe('Anti-Corruption Layer');
    expect(classifyRelationship('Open Host Service')?.name).toBe('Open Host Service');
    expect(classifyRelationship('ohs')?.name).toBe('Open Host Service');
    expect(classifyRelationship('Customer/Supplier')?.name).toBe('Customer-Supplier');
    expect(classifyRelationship('CS')?.name).toBe('Customer-Supplier');
    expect(classifyRelationship('Shared Kernel')?.name).toBe('Shared Kernel');
    expect(classifyRelationship('Published Language')?.name).toBe('Published Language');
    expect(classifyRelationship('Separate Ways')?.name).toBe('Separate Ways');
  });

  it('classifies directional vs symmetric vs none', () => {
    expect(classifyRelationship('ACL')?.kind).toBe('directional');
    expect(classifyRelationship('Partnership')?.kind).toBe('symmetric');
    expect(classifyRelationship('Shared Kernel')?.kind).toBe('symmetric');
    expect(classifyRelationship('Separate Ways')?.kind).toBe('none');
  });

  it('carries pattern-specific decoration flags', () => {
    expect(classifyRelationship('ACL')?.aclGate).toBe(true);
    expect(classifyRelationship('OHS')?.ohsSocket).toBe(true);
    expect(classifyRelationship('Partnership')?.thick).toBe(true);
    expect(classifyRelationship('Shared Kernel')?.doubleStroke).toBe(true);
    expect(classifyRelationship('Separate Ways')?.dashed).toBe(true);
  });

  it('returns null for a free-text label', () => {
    expect(classifyRelationship('reads cargo & delivery from')).toBeNull();
    expect(classifyRelationship('integrates with')).toBeNull();
    expect(classifyRelationship('')).toBeNull();
  });
});
