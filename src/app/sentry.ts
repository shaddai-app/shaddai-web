import * as Sentry from '@sentry/react';
import type { Breadcrumb, ErrorEvent } from '@sentry/react';

// Errores no previstos del navegador a Sentry, solo si el build tiene VITE_SENTRY_DSN. Sin datos
// personales: las URLs van sin parámetros ni fragmento (enlaces de recuperación con token, búsquedas
// por nombre) y del usuario no se manda nada.

/** Saca el query string y el fragmento de una URL. */
export function stripQuery(url: string): string {
  return url.split(/[?#]/)[0]!;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request = { url: event.request.url ? stripQuery(event.request.url) : undefined };
  }
  delete event.user;
  return event;
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  // Lo escrito en la consola puede traer datos de pantalla: no se manda.
  if (crumb.category === 'console') return null;
  if (crumb.data) {
    const data = { ...crumb.data };
    for (const key of ['url', 'from', 'to']) {
      if (typeof data[key] === 'string') data[key] = stripQuery(data[key]);
    }
    crumb.data = data;
  }
  return crumb;
}

let enabled = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
  enabled = true;
}

export function reportError(err: unknown): void {
  if (enabled) Sentry.captureException(err);
}
