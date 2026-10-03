# shaddai-web

Front web del SaaS **Shaddai** de administración de iglesias. React 19 · Vite 8 · TypeScript · Mantine 9 · TanStack Router/Query · i18next (es/en/pt). Responsive y PWA (líderes de célula lo usan desde el celular).

## Requisitos

- Node.js 24 LTS (`winget install --id OpenJS.NodeJS.LTS -e`)
- La API [`shaddai-api`](../shaddai-api) corriendo en `http://localhost:3000` (ver su README).

## Levantar

```powershell
npm ci
copy .env.example .env    # opcional: por defecto usa /api/v1 vía proxy de Vite
npm run dev               # http://localhost:5173
```

En desarrollo, Vite hace proxy de `/api` → `http://localhost:3000`, así front y API comparten origen (necesario para la cookie httpOnly `SameSite=Strict` del refresh token).

## PWA y modo sin señal

La app se instala en el celular y abre sin conexión (`vite-plugin-pwa`). El service worker solo existe en el build, así que para probarlo:

```powershell
npm run build
npm run preview           # http://localhost:4173 (proxy de /api igual que en dev)
```

La API rechaza el refresh desde orígenes que no están en `CORS_ORIGINS` (defensa CSRF): para probar el preview, agregá `http://localhost:4173` en el `.env` de la API.

- **Caché**: la app (HTML/JS/CSS) queda precacheada y los tiles del mapa ya vistos se guardan; la API **nunca** se sirve desde la caché.
- **Instantáneas** (IndexedDB, `src/pwa/`): el último `/me` y las células del líder. Sin conexión (y solo por falta de red: una sesión vencida va al login) la app arranca con ellas.
- **Reporte semanal**: el borrador se guarda mientras se escribe; si al enviar no hay señal queda en cola y `OutboxSync` lo manda al volver la conexión.
- **Cerrar sesión** borra todo lo guardado en el dispositivo.
- Una versión nueva no se aplica sola: se muestra un aviso y el usuario elige cuándo actualizar.

## Scripts

| Script                                | Descripción                                        |
| ------------------------------------- | -------------------------------------------------- |
| `dev`                                 | Servidor de desarrollo                             |
| `build`                               | Typecheck + build de producción en `dist/`         |
| `preview`                             | Sirve el build                                     |
| `lint`, `typecheck`, `format`, `test` | Calidad                                            |
| `i18n:check`                          | Verifica que en/pt tengan las mismas claves que es |

## Estructura

```
src/app/        providers (Mantine, Query, i18n)
src/routes/     rutas file-based (TanStack Router genera routeTree.gen.ts)
src/layout/     AppShell, header, toggles de tema e idioma
src/theme/      tema Mantine y presets de color de cuenta
src/i18n/       configuración i18next + tipos de claves
src/locales/    {es,en,pt}/{namespace}.json — es es la fuente de verdad
src/api/        fetch base (Fase 1: cliente tipado generado con orval)
src/features/   módulos de negocio
```

## i18n y tema

- Idiomas: español (por defecto), inglés, portugués. Claves tipadas desde `es`; `npm run i18n:check` en CI.
- Tema claro / oscuro / según el sistema (toggle en el header), sin parpadeo al cargar. El color primario lo elige cada cuenta entre 6 presets sobrios.

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para ramas y commits.

## Producción y seguridad

- `npm run build` genera `dist/staticwebapp.config.json` (Azure Static Web Apps) con la CSP y los headers de seguridad (`build/security-headers.ts`). `npm run preview` sirve los mismos headers, así se prueban antes de publicar.
- La CSP solo deja conectarse a la API y a Sentry configurados **al compilar** (`VITE_API_BASE`, `VITE_SENTRY_DSN`): si cambian, hay que recompilar.
- Sentry se activa con `VITE_SENTRY_DSN` y no envía datos personales (`src/app/sentry.ts`).
- Decisiones de infraestructura y revisión de seguridad: `docs/produccion.md` y `docs/seguridad.md` en shaddai-api.
- Política de privacidad (`/privacidad`) y términos (`/terminos`): textos en `src/locales/*/legal.json`. Son un **borrador** hasta que los revise un abogado; después de la revisión, poner `LEGAL_DRAFT = false` y actualizar `LEGAL_UPDATED` en `src/features/legal/constants.ts`. El contacto sale de `VITE_SUPPORT_EMAIL`.
