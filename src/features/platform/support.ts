import type { QueryClient } from '@tanstack/react-query';
import type { Impersonation } from '../../api/platform';
import { sessionStore } from '../../auth/session-store';

/**
 * Pasa a la sesión de soporte: las requests usan el token de impersonación (30 min, sin refresh).
 * Se vacía el caché para que nada de la sesión anterior se mezcle con la de la iglesia.
 */
export function enterSupport(queryClient: QueryClient, imp: Impersonation) {
  sessionStore.getState().startSupport({
    accessToken: imp.accessToken,
    expiresAt: imp.expiresAt,
    userEmail: imp.user.email,
  });
  queryClient.clear();
}

/** Vuelve a la sesión propia del superadmin (el token propio sigue en memoria). */
export function leaveSupport(queryClient: QueryClient) {
  sessionStore.getState().endSupport();
  queryClient.clear();
}
