export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}

/** Fetch base. En Fase 1 suma Bearer token + refresh single-flight; el cliente tipado lo genera orval. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'shaddai', ...init?.headers },
  });
  const body = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'NETWORK_ERROR', body?.error?.details);
  }
  return body as T;
}
