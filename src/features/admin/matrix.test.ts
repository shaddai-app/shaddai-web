import { describe, expect, it } from 'vitest';
import { diffCount, nextScope, sameGrants } from './matrix';

describe('matriz de permisos', () => {
  it('cicla sin acceso → todo → propio → sin acceso cuando el permiso admite alcance', () => {
    expect(nextScope(undefined, true)).toBe('all');
    expect(nextScope('all', true)).toBe('own');
    expect(nextScope('own', true)).toBeUndefined();
  });

  it('salta "propio" en permisos que no lo admiten', () => {
    expect(nextScope(undefined, false)).toBe('all');
    expect(nextScope('all', false)).toBeUndefined();
  });

  it('cuenta las celdas cambiadas', () => {
    const a = { 'celulas.ver': 'own', 'eventos.ver': 'all' } as const;
    expect(diffCount(a, { ...a })).toBe(0);
    expect(diffCount(a, { 'celulas.ver': 'all', 'eventos.ver': 'all', 'finanzas.ver': 'all' })).toBe(2);
    expect(diffCount(a, {})).toBe(2);
    expect(sameGrants(a, { ...a })).toBe(true);
    expect(sameGrants(a, { 'celulas.ver': 'own' })).toBe(false);
  });
});
