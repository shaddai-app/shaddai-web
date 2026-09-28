import dayjs from 'dayjs';
import { ApiError } from '../api/http';
import i18n from './index';

/** "2026-08" → "agosto 2026" (en el idioma activo), para los errores de meses cerrados. */
const monthName = (year: number, month: number) =>
  dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY');

/** Mensaje traducido para un error de la API (por código estable), o uno genérico. */
export function errorMessage(err: unknown): string {
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key as never, { ns: 'errors', ...options }) as string;
  if (err instanceof ApiError) {
    const details = (err.details ?? {}) as {
      retryAfterSeconds?: number;
      days?: number;
      year?: number;
      month?: number;
    };
    const minutes = details.retryAfterSeconds ? Math.ceil(details.retryAfterSeconds / 60) : undefined;
    const period = details.year && details.month ? monthName(details.year, details.month) : undefined;
    const translated = t(`codes.${err.code}`, { minutes, days: details.days, period, defaultValue: '' });
    return translated || t('generic');
  }
  if (err instanceof TypeError) return t('network'); // fetch sin conexión
  return t('generic');
}
