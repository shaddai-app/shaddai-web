import type { Me, Scope } from '../api/types';

/** Claves del catálogo de la API (`modulo.accion`). */
export type PermissionKey = `${string}.${string}`;

/** ¿Tiene al menos uno de los permisos? (misma semántica OR que la API) */
export function can(me: Pick<Me, 'permissions'> | null | undefined, ...keys: PermissionKey[]): boolean {
  if (!me) return false;
  return keys.length === 0 || keys.some((k) => Boolean(me.permissions[k]));
}

export function scopeOf(
  me: Pick<Me, 'permissions'> | null | undefined,
  key: PermissionKey,
): Scope | undefined {
  return me?.permissions[key];
}
