import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

// Headers de seguridad del front (CSP y compañía). Se arman con el index.html ya compilado: la CSP
// habilita por hash el único script inline (el que aplica el tema antes del primer render).
// En el build se escriben en dist/staticwebapp.config.json (Azure Static Web Apps) y `vite preview`
// sirve los mismos, así se prueban antes de publicar.

export interface HeaderOptions {
  /** index.html compilado. */
  html: string;
  /** VITE_API_BASE: relativa (misma origen) o absoluta (https://api.<dominio>/api/v1). */
  apiBase?: string;
  /** VITE_SENTRY_DSN, para permitir el envío de errores. */
  sentryDsn?: string;
  /** Producción con HTTPS: suma HSTS y upgrade-insecure-requests (en `vite preview` sobre http, no). */
  https: boolean;
}

const OSM_TILES = 'https://*.tile.openstreetmap.org';
const TURNSTILE = 'https://challenges.cloudflare.com';

export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    hashes.push(`'sha256-${createHash('sha256').update(match[1]!).digest('base64')}'`);
  }
  return hashes;
}

const originOf = (url?: string) => {
  if (!url || !/^https?:\/\//.test(url)) return undefined;
  return new URL(url).origin;
};

export function buildSecurityHeaders(opts: HeaderOptions): Record<string, string> {
  const connect = ["'self'", originOf(opts.apiBase), originOf(opts.sentryDsn), OSM_TILES].filter(Boolean);
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${[...inlineScriptHashes(opts.html), TURNSTILE].join(' ')}`,
    // Mantine y Leaflet usan estilos inline (atributo style y variables CSS).
    "style-src 'self' 'unsafe-inline'",
    // data: QR de la verificación en dos pasos · blob: fotos y comprobantes bajados con sesión.
    `img-src 'self' data: blob: ${OSM_TILES}`,
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    `frame-src ${TURNSTILE}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(opts.https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Cámara: escanear QR del inventario · ubicación: "mi ubicación" en el mapa de células.
    'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    ...(opts.https ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
  };
}

/** Configuración de Azure Static Web Apps: headers, SPA y caché. */
export function staticWebAppConfig(headers: Record<string, string>) {
  return {
    navigationFallback: {
      rewrite: '/index.html',
      exclude: ['/assets/*', '/*.{png,svg,ico,js,css,woff2,webmanifest,json}'],
    },
    globalHeaders: headers,
    routes: [
      // Los archivos de /assets llevan hash en el nombre: se pueden cachear para siempre.
      { route: '/assets/*', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
      // El service worker y el index siempre se revalidan, así llegan las versiones nuevas.
      { route: '/sw.js', headers: { 'Cache-Control': 'no-cache' } },
      { route: '/index.html', headers: { 'Cache-Control': 'no-cache' } },
    ],
    mimeTypes: { '.webmanifest': 'application/manifest+json' },
  };
}

/** Headers para `vite preview` (http local): los del build sin lo que exige HTTPS. */
export function previewHeaders(config: ReturnType<typeof staticWebAppConfig>): Record<string, string> {
  const headers = { ...config.globalHeaders };
  delete headers['Strict-Transport-Security'];
  headers['Content-Security-Policy'] = headers['Content-Security-Policy']!.replace(
    /; upgrade-insecure-requests/,
    '',
  );
  return headers;
}

export function securityHeaders(env: Record<string, string>): Plugin {
  let outDir = 'dist';
  const configFile = () => resolve(outDir, 'staticwebapp.config.json');
  return {
    name: 'shaddai-security-headers',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const headers = buildSecurityHeaders({
        html: await readFile(resolve(outDir, 'index.html'), 'utf8'),
        apiBase: env.VITE_API_BASE,
        sentryDsn: env.VITE_SENTRY_DSN,
        https: true,
      });
      await writeFile(configFile(), JSON.stringify(staticWebAppConfig(headers), null, 2) + '\n');
    },
    // Preview sirve exactamente lo que generó el build (no recalcula con el entorno de ahora).
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        readFile(configFile(), 'utf8').then((text) => {
          for (const [name, value] of Object.entries(previewHeaders(JSON.parse(text)))) {
            res.setHeader(name, value);
          }
          next();
        }, next);
      });
    },
  };
}
