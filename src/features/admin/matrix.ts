import type { Grants } from '../../api/admin';
import type { Scope } from '../../api/types';

export type Cell = Scope | undefined;

/** Ciclo al tocar una celda: sin acceso → todo → propio (si el permiso lo admite) → sin acceso. */
export function nextScope(current: Cell, supportsScope: boolean): Cell {
  if (!current) return 'all';
  if (current === 'all') return supportsScope ? 'own' : undefined;
  return undefined;
}

export function sameGrants(a: Grants, b: Grants): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/** Cantidad de celdas distintas entre dos juegos de permisos. */
export function diffCount(a: Grants, b: Grants): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => a[k] !== b[k]).length;
}
