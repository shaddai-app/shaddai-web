import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '../auth/session-store';
import { ApiError, apiRequest, refreshSession, sessionEvents } from './http';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  sessionStore.getState().clear();
});
afterEach(() => vi.unstubAllGlobals());

const calls = (path: string) => fetchMock.mock.calls.filter(([url]) => String(url).includes(path)).length;

describe('apiRequest', () => {
  it('manda Bearer, header anti-CSRF y cookies', async () => {
    sessionStore.getState().setAccessToken('tok-1');
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await apiRequest('/me');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    expect(init.headers['X-Requested-With']).toBe('shaddai');
    expect(init.credentials).toBe('include');
  });

  it('ante 401 renueva una vez y reintenta con el token nuevo', async () => {
    sessionStore.getState().setAccessToken('viejo');
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'nuevo' });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer nuevo'
        ? json(200, { id: 1 })
        : json(401, { error: { code: 'AUTH_TOKEN_INVALID' } });
    });
    await expect(apiRequest('/me')).resolves.toEqual({ id: 1 });
    expect(sessionStore.getState().accessToken).toBe('nuevo');
  });

  it('varios 401 simultáneos disparan UN solo refresh', async () => {
    sessionStore.getState().setAccessToken('viejo');
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        await new Promise((r) => setTimeout(r, 20));
        return json(200, { accessToken: 'nuevo' });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer nuevo' ? json(200, {}) : json(401, {});
    });
    await Promise.all([apiRequest('/a'), apiRequest('/b'), apiRequest('/c')]);
    expect(calls('/auth/refresh')).toBe(1);
  });

  it('si el refresh falla limpia la sesión y avisa', async () => {
    sessionStore.getState().setAccessToken('viejo');
    const onLogout = vi.fn();
    sessionEvents.addEventListener('logged-out', onLogout);
    fetchMock.mockImplementation(async () => json(401, { error: { code: 'AUTH_REFRESH_INVALID' } }));
    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 });
    expect(sessionStore.getState().accessToken).toBeNull();
    expect(onLogout).toHaveBeenCalledOnce();
    sessionEvents.removeEventListener('logged-out', onLogout);
  });

  it('un 409 de refresh (otra pestaña renovó) se reintenta', async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation(async () => {
      refreshCalls++;
      return refreshCalls === 1 ? json(409, {}) : json(200, { accessToken: 'ok' });
    });
    await expect(refreshSession()).resolves.toBe(true);
    expect(refreshCalls).toBe(2);
  });

  it('en modo soporte usa ese token y, si vence, vuelve a la sesión propia sin refresh', async () => {
    sessionStore.getState().setAccessToken('propio');
    sessionStore.getState().startSupport({ accessToken: 'soporte', expiresAt: '', userEmail: 'a@b.c' });
    const onEnded = vi.fn();
    sessionEvents.addEventListener('support-ended', onEnded);
    fetchMock.mockResolvedValue(json(401, {}));
    await expect(apiRequest('/me')).rejects.toBeInstanceOf(ApiError);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer soporte');
    expect(calls('/auth/refresh')).toBe(0);
    expect(sessionStore.getState().support).toBeNull();
    expect(sessionStore.getState().accessToken).toBe('propio');
    expect(onEnded).toHaveBeenCalledOnce();
    sessionEvents.removeEventListener('support-ended', onEnded);
  });

  it('traduce el cuerpo de error a ApiError con código y detalles', async () => {
    fetchMock.mockResolvedValue(
      json(423, { error: { code: 'AUTH_LOCKED', details: { retryAfterSeconds: 60 } } }),
    );
    await expect(apiRequest('/auth/login', { method: 'POST', auth: false })).rejects.toMatchObject({
      status: 423,
      code: 'AUTH_LOCKED',
      details: { retryAfterSeconds: 60 },
    });
    expect(calls('/auth/refresh')).toBe(0);
  });
});
