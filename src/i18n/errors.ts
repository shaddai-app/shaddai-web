import { ApiError } from '../api/http';
import i18n from './index';

/** Mensaje traducido para un error de la API (por código estable), o uno genérico. */
export function errorMessage(err: unknown): string {
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key as never, { ns: 'errors', ...options }) as string;
  if (err instanceof ApiError) {
    const details = (err.details ?? {}) as { retryAfterSeconds?: number; days?: number };
    const minutes = details.retryAfterSeconds ? Math.ceil(details.retryAfterSeconds / 60) : undefined;
    const translated = t(`codes.${err.code}`, { minutes, days: details.days, defaultValue: '' });
    return translated || t('generic');
  }
  if (err instanceof TypeError) return t('network'); // fetch sin conexión
  return t('generic');
}
