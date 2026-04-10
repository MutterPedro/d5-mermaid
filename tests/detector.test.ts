import { describe, it, expect } from 'vitest';
import { detectDomain } from '../src/d5-domain/detector.js';

describe('d5-domain detector', () => {
  it('detects text starting with d5-domain', () => {
    const text = `d5-domain
  title My Domain
  Domain(acme, "ACME") {
    Subdomain(s1, "Sub One", core)
  }`;
    expect(detectDomain(text)).toBe(true);
  });

  it('rejects text that does not start with d5-domain', () => {
    expect(detectDomain('flowchart LR\n  A --> B')).toBe(false);
    expect(detectDomain('d5-subdomain\n  title X')).toBe(false);
    expect(detectDomain('d5-context\n  title X')).toBe(false);
    expect(detectDomain('d5-aggregate\n  title X')).toBe(false);
    expect(detectDomain('')).toBe(false);
  });

  it('detects d5-domain with leading whitespace/newlines', () => {
    expect(detectDomain('  d5-domain\n  title X')).toBe(true);
    expect(detectDomain('\nd5-domain\n  title X')).toBe(true);
  });
});
