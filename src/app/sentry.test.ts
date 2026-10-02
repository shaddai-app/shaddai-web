import type { ErrorEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { scrubBreadcrumb, scrubEvent } from './sentry';

describe('Sentry sin datos personales', () => {
  it('la URL va sin token ni búsqueda y sin usuario', () => {
    const event = scrubEvent({
      type: undefined,
      request: { url: 'https://app.x.com/restablecer?token=secreto', headers: { 'User-Agent': 'x' } },
      user: { id: '1', email: 'a@b.com' },
    } as ErrorEvent);
    expect(event.request).toEqual({ url: 'https://app.x.com/restablecer' });
    expect(event.user).toBeUndefined();
  });

  it('breadcrumbs: navegación y fetch sin parámetros; la consola no se manda', () => {
    expect(
      scrubBreadcrumb({ category: 'navigation', data: { from: '/personas?q=Juan', to: '/restablecer#t' } })
        ?.data,
    ).toEqual({ from: '/personas', to: '/restablecer' });
    expect(
      scrubBreadcrumb({ category: 'fetch', data: { url: '/api/v1/people?q=Juan', method: 'GET' } })?.data,
    ).toEqual({ url: '/api/v1/people', method: 'GET' });
    expect(scrubBreadcrumb({ category: 'console', message: 'Juan Pérez' })).toBeNull();
  });
});
