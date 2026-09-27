import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { authApi, meApi } from '../api/auth';
import { lastRefreshWasOffline, refreshSession } from '../api/http';
import type { Me } from '../api/types';
import { clearOfflineData, isNetworkError, readMeSnapshot, saveMeSnapshot } from '../pwa/snapshots';
import { sessionStore } from './session-store';

export const meQuery = () =>
  queryOptions({
    // La clave distingue la sesión propia de la de soporte (son usuarios distintos).
    queryKey: ['me', sessionStore.getState().support ? 'support' : 'self'],
    queryFn: meApi.get,
    staleTime: 60_000,
  });

/** Hay sesión si ya tenemos access token o si la cookie de refresh sigue vigente (recarga de página). */
export async function ensureSession(): Promise<boolean> {
  const { accessToken, support } = sessionStore.getState();
  if (accessToken || support) return true;
  return refreshSession();
}

/**
 * Usuario de la sesión. Sin conexión (y solo por eso: una sesión vencida va al login) se arranca con
 * la última instantánea, para que el líder pueda abrir la app y cargar el reporte sin señal.
 */
export async function loadMe(queryClient: QueryClient): Promise<Me | null> {
  const fromSnapshot = async () => {
    const snap = await readMeSnapshot();
    if (snap) queryClient.setQueryData(meQuery().queryKey, snap);
    return snap;
  };
  if (!(await ensureSession())) return lastRefreshWasOffline() ? fromSnapshot() : null;
  try {
    const me = await queryClient.ensureQueryData(meQuery());
    // La sesión de soporte (superadmin impersonando) no deja rastros offline.
    if (!sessionStore.getState().support) void saveMeSnapshot(me);
    return me;
  } catch (err) {
    return isNetworkError(err) ? fromSnapshot() : null;
  }
}

/** Tras login / cambio de contraseña / 2FA: nuevo token y /me fresco. */
export async function applyNewToken(queryClient: QueryClient, accessToken: string): Promise<Me> {
  sessionStore.getState().setAccessToken(accessToken);
  await queryClient.invalidateQueries({ queryKey: ['me'] });
  return queryClient.fetchQuery(meQuery());
}

export async function logout(queryClient: QueryClient): Promise<void> {
  try {
    await authApi.logout();
  } finally {
    sessionStore.getState().clear();
    queryClient.clear();
    await clearOfflineData();
  }
}
