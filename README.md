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
