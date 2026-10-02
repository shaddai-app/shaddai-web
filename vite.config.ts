import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { securityHeaders } from './build/security-headers';

const apiProxy = { '/api': { target: 'http://localhost:3000', changeOrigin: false } };

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    // PWA: se instala en el celular y abre sin señal (la app queda en caché; los datos no).
    VitePWA({
      registerType: 'prompt', // una versión nueva se aplica cuando el usuario acepta (no en medio de un formulario)
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Shaddai',
        short_name: 'Shaddai',
        description: 'Administración de la iglesia',
        lang: 'es',
        theme_color: '#3b5f94',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // La API nunca se sirve desde la caché del service worker.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Tiles de OSM ya vistos (política de uso: se respeta la caché, no se descargan de antemano).
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    // CSP y headers de seguridad: dist/staticwebapp.config.json y los mismos en vite preview.
    securityHeaders(loadEnv(mode, process.cwd(), 'VITE_')),
  ],
  server: {
    port: 5173,
    strictPort: true,
    // Mismo origen en desarrollo: la cookie httpOnly del refresh funciona con SameSite=Strict.
    proxy: apiProxy,
  },
  // `vite preview` (build con service worker) también necesita la API en el mismo origen.
  preview: { port: 4173, strictPort: true, proxy: apiProxy },
}));
