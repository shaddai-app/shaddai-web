import {
  createTheme,
  defaultVariantColorsResolver,
  localStorageColorSchemeManager,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type VariantColorsResolver,
} from '@mantine/core';
import { customColors, DEFAULT_PRIMARY, type PrimaryPreset } from './presets';

export const COLOR_SCHEME_KEY = 'shaddai-color-scheme';
export const colorSchemeManager = localStorageColorSchemeManager({ key: COLOR_SCHEME_KEY });

/**
 * Grafito de la marca para el modo oscuro (Mantine usa dark-7 de fondo, dark-6 para los controles,
 * dark-4 para los bordes y dark-0/dark-2 para el texto).
 */
const graphite: MantineColorsTuple = [
  '#e6eaf0',
  '#c3cbd7',
  '#aab4c3',
  '#6e7a8d',
  '#2a3342',
  '#262d38',
  '#1e2530',
  '#12171f',
  '#0e1218',
  '#0a0d12',
];

/** Colores de la marca que no dependen de la paleta de Mantine (ver brand.css). */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-text': 'var(--sh-texto)',
    '--mantine-color-dimmed': 'var(--sh-texto-3)',
    '--mantine-color-default-border': 'var(--sh-borde)',
    '--mantine-color-default-hover': 'var(--sh-superficie-sutil)',
  },
  dark: {
    '--mantine-color-text': 'var(--sh-texto)',
    '--mantine-color-dimmed': 'var(--sh-texto-3)',
    '--mantine-color-default-border': 'var(--sh-borde)',
  },
});

/** Estados del kit (correcto, aviso, error, neutro) para las variantes suaves: badges, alertas, íconos. */
const STATUS_TOKENS: Record<string, 'ok' | 'aviso' | 'error' | 'neutro'> = {
  teal: 'ok',
  green: 'ok',
  yellow: 'aviso',
  red: 'error',
  gray: 'neutro',
};

const variantColorResolver: VariantColorsResolver = (input) => {
  const resolved = defaultVariantColorsResolver(input);
  // Solo con un color de estado explícito: si la iglesia eligió teal como primario, sus botones
  // suaves siguen siendo del primario y no "correcto".
  const token =
    input.color && input.color !== input.theme.primaryColor ? STATUS_TOKENS[input.color] : undefined;
  if (input.variant !== 'light' || !token) return resolved;
  return {
    background: `var(--sh-${token}-bg)`,
    hover: `color-mix(in srgb, var(--sh-${token}-bg), var(--sh-${token}) 10%)`,
    color: `var(--sh-${token})`,
    border: `1px solid transparent`,
  };
};

export function buildTheme(primaryColor: PrimaryPreset = DEFAULT_PRIMARY) {
  return createTheme({
    primaryColor,
    // Botón primario del kit: #3B5F94 en claro y #4A71A9 en oscuro (slate 7 y 6).
    primaryShade: { light: 7, dark: 6 },
    colors: { ...customColors, dark: graphite },
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    headings: { fontWeight: '600' },
    defaultRadius: 'md',
    cursorType: 'pointer',
    variantColorResolver,
    components: {
      // Objetivos táctiles >= 44px en mobile (WCAG 2.2 / uso desde el celular).
      Button: { defaultProps: { size: 'md' } },
      ActionIcon: { defaultProps: { size: 'lg', variant: 'subtle' } },
      // Tarjetas de 12 px de radio, como el kit.
      Card: { defaultProps: { radius: 'var(--sh-radio-tarjeta)' } },
    },
  });
}
