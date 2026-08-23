import { describe, expect, it } from 'bun:test';
import { normalizeUsername, usernameToInternalEmail, validateUsername } from '../../lib/username';

describe('Username authentication adapter', () => {
  it('normalizes casing and whitespace consistently', () => {
    expect(normalizeUsername('  Budi_Produksi  ')).toBe('budi_produksi');
  });

  it('accepts the supported username alphabet', () => {
    expect(validateUsername('budi_produksi2')).toBeNull();
  });

  it('rejects separators at the start/end and unsupported characters', () => {
    expect(validateUsername('_budi')).not.toBeNull();
    expect(validateUsername('budi_')).not.toBeNull();
    expect(validateUsername('budi@email')).not.toBeNull();
  });

  it('maps a username to the non-user-facing Supabase identity alias', () => {
    expect(usernameToInternalEmail('Budi_Produksi')).toBe('budi_produksi@users.ktg.invalid');
  });
});
