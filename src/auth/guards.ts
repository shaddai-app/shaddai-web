import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import type { Me } from '../api/types';
import { can, type PermissionKey } from './permissions';
import { loadMe } from './session';

interface GuardArgs {
  context: { queryClient: QueryClient };
  location: { href: string };
}

export type PendingStep = '/cambiar-contrasena' | '/configurar-2fa';

/** Paso pendiente de la sesión → pantalla obligatoria (no se puede navegar a otra ruta). */
export function pendingStepPath(me: Me): PendingStep | null {
  if (me.impersonation) return null; // en soporte no se completan pasos del usuario
  if (me.restriction === 'password_change') return '/cambiar-contrasena';
  if (me.restriction === 'totp_enroll') return '/configurar-2fa';
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
  if (!me) throw redirect({ to: '/login', search: { redirect: location.href } });
  const pending = pendingStepPath(me);
  if (pending) throw redirect({ to: pending });
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

/** Pantallas de paso obligatorio: requieren sesión; si ese paso ya no está pendiente, van al inicio. */
export async function requirePendingStep(
  { context, location }: GuardArgs,
  step: PendingStep,
  { allowVoluntary = false } = {},
): Promise<{ me: Me; forced: boolean }> {
  const me = await loadMe(context.queryClient);
  if (!me) throw redirect({ to: '/login', search: { redirect: location.href } });
  const pending = pendingStepPath(me);
  if (pending && pending !== step) throw redirect({ to: pending });
  if (!pending && !allowVoluntary) throw redirect({ to: homePath(me) });
  return { me, forced: pending === step };
}

/** Login y recuperación: si ya hay una sesión válida, no tiene sentido mostrarlos. */
export async function redirectIfLoggedIn({ context }: GuardArgs, target?: string): Promise<void> {
  const me = await loadMe(context.queryClient);
  if (!me) return;
  const pending = pendingStepPath(me);
  if (pending) throw redirect({ to: pending });
  throw redirect({ to: safeRedirect(target) ?? homePath(me) });
}

/** Permiso por pantalla. La API igual valida cada endpoint: esto evita mostrar lo que no corresponde. */
export function requirePermission(me: Me, ...keys: PermissionKey[]) {
  if (!can(me, ...keys)) throw redirect({ to: '/sin-acceso' });
}
