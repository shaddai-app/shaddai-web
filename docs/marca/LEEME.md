# Shaddai — Kit de marca y brief para la landing (v3: modo claro y oscuro)

> **Para Claude:** este archivo es el brief completo para diseñar y construir la landing page de Shaddai.
> Usá los archivos de esta carpeta tal cual (no redibujes el logo) y seguí las reglas de marca de abajo.
> Todo dato marcado como `[COMPLETAR]` no existe todavía: dejalo como marcador visible, **no lo inventes**
> (precios, testimonios, cifras, contacto, dominio).

---

## 1. Qué es Shaddai

**Shaddai** es un SaaS (aplicación web) de **administración de iglesias**.
Lema oficial (ya usado dentro de la app): **"Administración para tu iglesia"**.

- Se usa desde la computadora y **desde el celular**: es una PWA instalable; los líderes de célula la usan en el teléfono
  y el reporte semanal funciona **sin señal** (se guarda y se envía al volver la conexión).
- Multi-iglesia (cada iglesia tiene su cuenta) y **multi-sede**.
- Idiomas: **español** (principal), **inglés** y **portugués**.
- Tema claro / oscuro.
- Mercado inicial: Latinoamérica, con español rioplatense (voseo). El cobro es por **débito automático con Mercado Pago**.
- Hay **prueba gratis** (cantidad de días: `[COMPLETAR]`). Precios de los planes: `[COMPLETAR]` (en la app figuran como "Precio a definir").

### Módulos (todos existen en la app; textos tomados de la interfaz)

| Área                           | Qué permite                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Personas y familias**        | Ficha de cada miembro, grupos familiares, registro de **nuevos** e importación de personas.                                                                                                                                                                                          |
| **Consolidación**              | Seguimiento paso a paso de cada persona nueva, tareas de seguimiento y células cercanas.                                                                                                                                                                                             |
| **Células**                    | Grupos que se reúnen en casas durante la semana: **mapa de células**, **reporte semanal** (también sin conexión), **semáforo** de reportes (qué células enviaron y cuáles faltan), **genealogía** (de qué célula nació cada una) y **multiplicación**. Estructura por redes y zonas. |
| **Discipulado**                | Cursos con niveles, sesiones y asistencia de cada alumno.                                                                                                                                                                                                                            |
| **Calendario y eventos**       | Eventos, inscripciones (con formulario público) y asistencia.                                                                                                                                                                                                                        |
| **Ministerios**                | Equipos, turnos y "Mis turnos" para cada servidor.                                                                                                                                                                                                                                   |
| **Alabanza**                   | Cancionero con acordes (ChordPro) y listas para cada reunión.                                                                                                                                                                                                                        |
| **Oración y anuncios**         | Pedidos de oración y anuncios para la congregación, con notificaciones.                                                                                                                                                                                                              |
| **Finanzas**                   | Cajas, categorías, movimientos, **arqueos** de ofrendas, ofrendas pendientes, **cierres** mensuales y reportes.                                                                                                                                                                      |
| **Inventario**                 | Bienes de la iglesia, mantenimiento, **préstamos** y escaneo de códigos.                                                                                                                                                                                                             |
| **Administración y seguridad** | Usuarios, **roles y permisos** configurables, auditoría, verificación en dos pasos (2FA), exportación de datos.                                                                                                                                                                      |

**Para quién:** pastores, administradores y secretarías de iglesias; líderes de célula y de ministerios; tesoreros.

---

## 2. Archivos del kit

```
pantallas/  ← capturas de la app con la marca aplicada, en modo claro y oscuro (datos de ejemplo de la demo)
tema/       ← shaddai-tema.css: variables de color de los dos modos, listas para usar
logo/svg/   ← usar SIEMPRE el SVG en la web
logo/png/   ← para documentos, redes, presentaciones
app-icons/  ← favicon y íconos de app (mismos nombres que usa el proyecto shaddai-web/public)
social/     ← imagen para compartir enlaces (og-image) y avatar de redes
```

| Archivo                                                                                                                                   | Cuándo usarlo                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `shaddai-logo-horizontal-color.svg`                                                                                                       | **Logo principal.** Header de la landing sobre fondo claro.                                                      |
| `shaddai-logo-horizontal-color-dark.svg`                                                                                                  | Sobre fondo Azul noche (#1F3456) o fotos oscuras: header oscuro, footer.                                         |
| `shaddai-logo-horizontal-lema-*.svg`                                                                                                      | Logo con el lema "ADMINISTRACIÓN PARA TU IGLESIA". Hero, footer, documentos. No usar a menos de 220 px de ancho. |
| `shaddai-logo-vertical-*.svg`                                                                                                             | Composiciones centradas y cuadradas: pantalla de carga, portadas, stands.                                        |
| `shaddai-wordmark-*.svg`                                                                                                                  | Solo el nombre, cuando el ícono ya aparece cerca.                                                                |
| `shaddai-icono-color.svg`                                                                                                                 | Ícono solo (hexágono con la letra ש). Avatares, favicon, botón de "instalar app".                                |
| `*-mono-navy` / `*-mono-white`                                                                                                            | Una sola tinta: impresión a 1 color, sellos, fondos con foto.                                                    |
| `app-icons/favicon.svg`, `favicon.ico`, `apple-touch-icon-180x180.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` | Íconos del sitio y de la app.                                                                                    |
| `social/og-image-1200x630.png`                                                                                                            | Vista previa al compartir el enlace (Open Graph / Twitter).                                                      |

### Etiquetas para el `<head>`

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
<meta name="theme-color" content="#1F3456" />
<meta property="og:title" content="Shaddai — Administración para tu iglesia" />
<meta property="og:image" content="https://[COMPLETAR-DOMINIO]/og-image-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
```

---

## 3. El logo

- **Ícono:** hexágono (una _célula_: la iglesia organizada en grupos) con la letra hebrea **ש (Shin)**, inicial de _Shaddai_ (שַׁדַּי, "Todopoderoso"). El **punto dorado** arriba a la derecha es el punto de la Shin (le da el sonido "sh").
- **Nombre:** "Shaddai" en **Frank Ruhl Libre ExtraBold**, convertido a trazos. El **punto de la "i" es dorado** y repite el punto de la ש: es el único detalle dorado del logotipo.
- **Área de respeto:** dejar libre alrededor del logo al menos la mitad del alto del hexágono.
- **Tamaño mínimo:** logo horizontal 120 px de ancho en pantalla (25 mm impreso); ícono 16 px.

**No hacer:** cambiar colores del logo; poner el logo color sobre fondos azules medios (usar la versión `-dark` o `-mono-white`); estirar, rotar o agregar sombras/brillos; reescribir "Shaddai" con otra tipografía; agregar más elementos dorados al logo; reemplazar la ש por otra letra o por una forma "parecida".

---

## 4. Colores y modos (claro / oscuro)

La app tiene **modo claro y modo oscuro**, y la landing también debe tenerlos (por defecto según el sistema, con un botón para cambiar).
Todas las variables están en **`tema/shaddai-tema.css`**: usalas en lugar de escribir colores sueltos. Mirá `pantallas/` para ver cómo quedan.

### Colores de marca (iguales en los dos modos)

| Token                  | Hex       | Uso                                                                                                   |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `--sh-azul`            | `#3B5F94` | Color primario. Botones, enlaces, hexágono del logo. (Es el color "slate" por defecto de la app.)     |
| `--sh-azul-noche`      | `#1F3456` | Hero, paneles de marca, footer en modo claro.                                                         |
| `--sh-dorado`          | `#E0B85E` | Acento sobre fondos oscuros, **con moderación**: un detalle por bloque (una línea corta, un puntito). |
| `--sh-dorado-profundo` | `#C99A3E` | Acento dorado sobre fondos claros (decorativo).                                                       |
| `--sh-marfil`          | `#F7F3EA` | Color de **estructura** en modo claro.                                                                |

### Modo claro — "contenido blanco, estructura marfil"

- El **contenido** (fondo de página, tarjetas, formularios) es **blanco** `#FFFFFF`.
- La **estructura** va en **marfil** `#F7F3EA`: encabezado/barra superior, menú lateral, barra inferior en el celular y, en la landing, el header, bandas de secciones alternadas y el pie.
- El ítem activo del menú es una "pastilla" blanca sobre el marfil, con un puntito dorado `#C99A3E`.
- Bordes cálidos `#EBE5D8`. Textos `#1A2232` / `#3D4757` / `#5B6472`.
- Bajo los títulos de página: una línea corta de 36×3 px en `#E6D9BB`.

### Modo oscuro — "grafito con toques de marfil"

- Fondo `#12171F`, superficies (encabezado, menú, tarjetas) `#1A212C`, bordes `#2A3342`.
- **Textos siempre fríos/neutros** (`#E6EAF0`, `#AAB4C3`, `#8F9AAC`): **nunca** texto marfil ni dorado.
- El **marfil aparece solo en detalles**: puntito del ítem activo `#F7F3EA`, anillo del avatar y línea bajo títulos `#D9D2C3`, línea divisoria del encabezado `#3A3934`, fondo del ítem activo gris cálido `#2A2C2F`.
- Botón primario `#4A71A9`; enlaces `#8CA6C8`. Logo: versión `-color-dark`.

### Estados (fondo / texto)

| Estado                         | Claro                 | Oscuro                |
| ------------------------------ | --------------------- | --------------------- |
| Correcto (Enviado, Confirmado) | `#E6F4EA` / `#1E6B3A` | `#173A26` / `#7FD49B` |
| Aviso (En espera, Pendiente)   | `#FDF3DC` / `#7A4F00` | `#3D3014` / `#F0C96A` |
| Error (Falta)                  | `#FDE8E8` / `#A32626` | `#44201F` / `#F19A9A` |
| Neutro (Anulado, Sin reunión)  | `#EEF0F3` / `#4B5563` | `#262D38` / `#AAB4C3` |

Escala del azul (la misma de la app, de claro a oscuro):
`#eef3f8 #dce4ee #b5c6db #8ca6c8 #6a8bb7 #557aad #4a71a9 #3b5f94 #325485 #254877`

## 5. Tipografías (Google Fonts, licencia OFL)

- **Frank Ruhl Libre** (500, 700, 800): títulos, frases destacadas, números grandes. Es una serif diseñada para convivir con el hebreo: une la marca con su raíz bíblica.
- **Inter** (400, 500, 600): textos, botones, formularios. Es la tipografía de la app, así la landing y el producto se sienten iguales.

```html
<link
  href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;800&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

Sugerencia de escala: H1 56–64 px Frank Ruhl 800 · H2 40 px Frank Ruhl 700 · H3 22 px Inter 600 · cuerpo 17–18 px Inter 400 · interlineado 1.6.

---

## 6. Tono de voz

- Español rioplatense con **voseo**, como la app ("Ingresá a tu cuenta", "Probalo gratis").
- Cálido, claro y concreto: habla de personas y de cuidado pastoral, no de "optimizar procesos".
- Fe presente con respeto, sin exagerar ni usar lenguaje de una sola denominación.
- Frases cortas. Nada de jerga técnica en titulares (PWA → "funciona en el celular, incluso sin señal").

---

## 7. Estructura sugerida para la landing

1. **Header** (fondo marfil en claro, `#1A212C` en oscuro): logo horizontal color (o `-color-dark` en oscuro) · Funciones · Precios · Preguntas · botón "Ingresar" (a la app) · botón primario "Probar gratis".
2. **Hero** (fondo Azul noche): título en Frank Ruhl (ej. "Administración para tu iglesia"), bajada de 1–2 líneas sobre personas, células y finanzas en un solo lugar, CTA "Probar gratis" + "Ver cómo funciona", captura de la app `[COMPLETAR: captura real]`. Un solo detalle dorado (línea bajo el título).
3. **Para quién**: pastores · líderes de célula · tesorería · secretaría.
4. **Módulos** (grilla de tarjetas usando la tabla de la sección 1).
5. **Destacado células**: mapa, reporte semanal desde el celular sin señal, semáforo, genealogía y multiplicación.
6. **Destacado finanzas**: cajas, arqueos, cierres mensuales y reportes.
7. **Seguridad y confianza**: roles y permisos, auditoría, verificación en dos pasos, exportación de datos.
8. **Funciona en el celular**: se instala como app; español, inglés y portugués.
9. **Precios**: `[COMPLETAR]` (planes, precio en pesos, días de prueba). Pago con Mercado Pago, débito automático, se cancela cuando quieras.
10. **Preguntas frecuentes**.

Alterná secciones de fondo blanco con bandas marfil (en oscuro: `#12171F` y `#1A212C`). Incluí el selector de tema claro/oscuro en el header. 11. **CTA final** + **Footer** (logo con lema versión dark, enlaces a /privacidad y /terminos, contacto `[COMPLETAR: email de soporte]`).

**No inventar:** testimonios, logos de iglesias clientes, cantidad de usuarios, porcentajes de ahorro, precios ni premios.

---

## 8. Relación con la app

La app (`shaddai-web`) usa Mantine 9 con el color primario "slate" (`#3B5F94`, shade 7 en claro / 5 en oscuro), radio `md` e Inter.
La landing debe verse de la misma familia: mismos colores, radios de 8–12 px, botones de 44 px de alto mínimo.
