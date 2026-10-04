import { sessionStore } from '../auth/session-store';

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

/** Error de la API con el código estable que el front traduce (namespace "errors"). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** false: no manda Authorization ni intenta refresh (login, forgot, reset). */
  auth?: boolean;
  /** Respuesta binaria (archivos). */
  blob?: boolean;
  signal?: AbortSignal;
}

const CSRF_HEADER = { 'X-Requested-With': 'shaddai' };

function buildUrl(path: string, query?: Query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {}))
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return `${API_BASE}${path}${s ? `?${s}` : ''}`;
}

async function parseError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => undefined)) as
    { error?: { code?: string; details?: unknown } } | undefined;
  return new ApiError(res.status, body?.error?.code ?? `HTTP_${res.status}`, body?.error?.details);
}

// ── Refresh single-flight ─────────────────────────────────────────────────────
// Si varias requests reciben 401 a la vez, una sola renueva y las demás esperan ese resultado.
let refreshing: Promise<boolean> | null = null;
let refreshOffline = false;

/** ¿El último refresh falló por falta de conexión (y no porque la sesión venció)? */
export const lastRefreshWasOffline = () => refreshOffline;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function doRefresh(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: CSRF_HEADER,
    }).catch(() => null);
    refreshOffline = !res;
    if (!res) return false;
    if (res.ok) {
      const { accessToken } = (await res.json()) as { accessToken: string };
      sessionStore.getState().setAccessToken(accessToken);
      return true;
    }
    // 409: otra pestaña renovó al mismo tiempo; la cookie nueva ya está en el navegador.
    if (res.status === 409 && attempt === 0) {
      await sleep(400);
      continue;
    }
    return false;
  }
  return false;
}

export function refreshSession(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Avisos a la app (el router escucha para redirigir al login o salir del modo soporte). */
export const sessionEvents = new EventTarget();

function currentToken(): { token: string | null; support: boolean } {
  const { support, accessToken } = sessionStore.getState();
  return support ? { token: support.accessToken, support: true } : { token: accessToken, support: false };
}

async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const isForm = options.body instanceof FormData;
  const headers: Record<string, string> = { ...CSRF_HEADER };
  if (!isForm && options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body: isForm
      ? (options.body as FormData)
      : options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    signal: options.signal,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  const initial = useAuth ? currentToken() : { token: null, support: false };
  const support = initial.support;
  let token = initial.token;
  let res = await send(path, options, token);

  if (res.status === 401 && useAuth) {
    if (support) {
      // La sesión de soporte venció o se cortó: se vuelve a la sesión propia del superadmin.
      sessionStore.getState().endSupport();
      sessionEvents.dispatchEvent(new Event('support-ended'));
    } else if (await refreshSession()) {
      ({ token } = currentToken());
      res = await send(path, options, token);
    }
    if (res.status === 401 && !support) {
      sessionStore.getState().clear();
      sessionEvents.dispatchEvent(new Event('logged-out'));
    }
  }

  if (!res.ok) throw await parseError(res);
  if (options.blob) return (await res.blob()) as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, opts: Omit<RequestOptions, 'method' | 'query'> = {}) =>
    apiRequest<T>(path, { ...opts, query }),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T = void>(path: string, opts: Omit<RequestOptions, 'method'> = {}) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
