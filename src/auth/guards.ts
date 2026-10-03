import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import type { Me } from '../api/types';
import { can, type PermissionKey } from './permissions';
import { loadMe } from './session';
import type { AuthView, PendingStep } from './views';

interface GuardArgs {
  context: { queryClient: QueryClient };
  location: { href: string };
}

/**
 * Paso obligatorio pendiente de la sesión: se completa en la tarjeta del home (`/?vista=…`) y no se
 * puede navegar a otra pantalla hasta terminarlo.
 */
export function pendingStep(me: Me): PendingStep | null {
  if (me.impersonation) return null; // en soporte no se completan pasos del usuario
  if (me.restriction === 'password_change') return 'cambiar-contrasena';
  if (me.restriction === 'totp_enroll') return 'configurar-2fa';
  return null;
}

export const isPlatformSession = (me: Me) => me.user.isPlatformAdmin && !me.impersonation;

export function homePath(me: Me): '/inicio' | '/plataforma' {
  return isPlatformSession(me) ? '/plataforma' : '/inicio';
}

/** Solo acepta rutas internas como destino post-login (evita open redirect). */
export function safeRedirect(target: unknown): string | undefined {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : undefined;
}

/** Layout principal: sesión completa (sin pasos pendientes). */
export async function requireShell({ context, location }: GuardArgs): Promise<{ me: Me }> {
  const me = await loadMe(context.queryClient);
  if (!me) throw redirect({ to: '/', search: { redirect: location.href } });
  const pending = pendingStep(me);
  if (pending) throw redirect({ to: '/', search: { vista: pending } });
  return { me };
}

/** Pantallas de la iglesia: el superadmin solo entra impersonando. */
export function requireChurch(me: Me) {
  if (isPlatformSession(me)) throw redirect({ to: '/plataforma' });
}

/** Panel de plataforma: solo el superadmin en su propia sesión. */
export function requirePlatform(me: Me) {
  if (!isPlatformSession(me)) throw redirect({ to: '/inicio' });
}

/**
 * Home público (landing con la tarjeta de ingreso). Con sesión no se muestra, salvo para completar el
 * paso obligatorio pendiente; sin sesión, los pasos obligatorios vuelven al login.
 */
export async function guardHome(
  { context }: Pick<GuardArgs, 'context'>,
  search: { vista?: AuthView; redirect?: string },
): Promise<void> {
  const me = await loadMe(context.queryClient);
  const forcedView = search.vista === 'cambiar-contrasena' || search.vista === 'configurar-2fa';
  if (!me) {
    if (forcedView) throw redirect({ to: '/', search: { redirect: search.redirect } });
    return;
  }
  const pending = pendingStep(me);
  if (pending) {
    if (search.vista !== pending) throw redirect({ to: '/', search: { vista: pending } });
    return;
  }
  throw redirect({ to: safeRedirect(search.redirect) ?? homePath(me) });
}

/** Permiso por pantalla. La API igual valida cada endpoint: esto evita mostrar lo que no corresponde. */
export function requirePermission(me: Me, ...keys: PermissionKey[]) {
  if (!can(me, ...keys)) throw redirect({ to: '/sin-acceso' });
}
