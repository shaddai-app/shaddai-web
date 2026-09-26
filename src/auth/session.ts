import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { authApi, meApi } from '../api/auth';
import { refreshSession } from '../api/http';
import type { Me } from '../api/types';
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

export async function loadMe(queryClient: QueryClient): Promise<Me | null> {
  if (!(await ensureSession())) return null;
  try {
    return await queryClient.ensureQueryData(meQuery());
  } catch {
    return null;
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
  }
}
