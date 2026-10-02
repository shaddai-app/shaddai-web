import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildSecurityHeaders,
  inlineScriptHashes,
  previewHeaders,
  staticWebAppConfig,
} from './security-headers';

const inline = "(function(){document.documentElement.setAttribute('x','y')})();";
const html = `<html><head><script>${inline}</script><script type="module" src="/assets/i.js"></script></head></html>`;
const csp = (headers: Record<string, string>) =>
  Object.fromEntries(
    headers['Content-Security-Policy']!.split('; ').map((d) => {
      const [name, ...values] = d.split(' ');
      return [name, values];
    }),
  );

describe('headers de seguridad', () => {
  it('habilita por hash solo los scripts inline', () => {
    const hash = createHash('sha256').update(inline).digest('base64');
    expect(inlineScriptHashes(html)).toEqual([`'sha256-${hash}'`]);
  });

  it('API y Sentry en otro dominio quedan habilitados solo para conectarse', () => {
    const headers = buildSecurityHeaders({
      html,
      apiBase: 'https://api.ejemplo.com/api/v1',
      sentryDsn: 'https://abc@o1.ingest.us.sentry.io/2',
      https: true,
    });
    const d = csp(headers);
    expect(d['connect-src']).toEqual([
      "'self'",
      'https://api.ejemplo.com',
      'https://o1.ingest.us.sentry.io',
      'https://*.tile.openstreetmap.org',
    ]);
    expect(d['script-src']).not.toContain("'unsafe-inline'");
    expect(d['frame-ancestors']).toEqual(["'none'"]);
    expect(d['object-src']).toEqual(["'none'"]);
    expect(d['upgrade-insecure-requests']).toEqual([]);
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('con la API en el mismo origen y sin HTTPS (vite preview)', () => {
    const headers = buildSecurityHeaders({ html, apiBase: '/api/v1', https: false });
    expect(csp(headers)['connect-src']).toEqual(["'self'", 'https://*.tile.openstreetmap.org']);
    expect(csp(headers)['upgrade-insecure-requests']).toBeUndefined();
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('Static Web Apps: fallback de SPA y caché larga solo para assets con hash', () => {
    const config = staticWebAppConfig({ 'X-Frame-Options': 'DENY' });
    expect(config.navigationFallback.rewrite).toBe('/index.html');
    expect(config.globalHeaders).toEqual({ 'X-Frame-Options': 'DENY' });
    const cache = (route: string) => config.routes.find((r) => r.route === route)?.headers['Cache-Control'];
    expect(cache('/sw.js')).toBe('no-cache');
    expect(cache('/assets/*')).toContain('immutable');
  });
});

describe('vite preview', () => {
  it('sirve los headers del build sin HSTS ni upgrade-insecure-requests', () => {
    const headers = buildSecurityHeaders({ html, apiBase: '/api/v1', https: true });
    const preview = previewHeaders(staticWebAppConfig(headers));
    expect(preview['Strict-Transport-Security']).toBeUndefined();
    expect(preview['Content-Security-Policy']).not.toContain('upgrade-insecure-requests');
    expect(preview['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });
});
