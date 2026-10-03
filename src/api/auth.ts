import { api } from './http';
import type {
  ActiveSession,
  LoginResponse,
  Me,
  SessionTokenResponse,
  ThemePreference,
  Locale,
} from './types';

export const authApi = {
  login: (body: { email: string; password: string; rememberMe: boolean }) =>
    api.post<LoginResponse>('/auth/login', body, { auth: false }),
  verify2fa: (body: { challengeToken: string; code: string }) =>
    api.post<SessionTokenResponse>('/auth/2fa/verify', body, { auth: false }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.post<SessionTokenResponse>('/auth/change-password', body),
  forgot: (email: string) => api.post<void>('/auth/forgot', { email }, { auth: false }),
  reset: (body: { token: string; newPassword: string }) =>
    api.post<void>('/auth/reset', body, { auth: false }),
  enrollTotp: () => api.post<{ secret: string; otpauthUri: string }>('/auth/2fa/enroll'),
  /** Activa la verificación en dos pasos; devuelve los códigos de recuperación (se muestran una vez). */
  confirmTotp: (code: string) =>
    api.post<SessionTokenResponse & { recoveryCodes: string[] }>('/auth/2fa/confirm', { code }),
  disableTotp: (body: { password: string; code: string }) => api.post<void>('/auth/2fa/disable', body),
  regenerateRecoveryCodes: (password: string) =>
    api.post<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes', { password }),
  logout: () => api.post<void>('/auth/logout', undefined, { auth: false }),
  logoutAll: () => api.post<void>('/auth/logout-all'),
  stopSupport: () => api.post<void>('/auth/impersonation/stop'),
};

export const meApi = {
  get: () => api.get<Me>('/me'),
  update: (
    body: Partial<{ firstName: string; lastName: string; locale: Locale | null; theme: ThemePreference }>,
  ) => api.patch<Pick<Me, 'user' | 'account'>>('/me', body),
  sessions: () => api.get<{ items: ActiveSession[] }>('/me/sessions'),
  revokeSession: (id: string) => api.delete(`/me/sessions/${id}`),
};
