import { createTheme, localStorageColorSchemeManager } from '@mantine/core';
import { customColors, DEFAULT_PRIMARY, type PrimaryPreset } from './presets';

export const COLOR_SCHEME_KEY = 'shaddai-color-scheme';
export const colorSchemeManager = localStorageColorSchemeManager({ key: COLOR_SCHEME_KEY });

export function buildTheme(primaryColor: PrimaryPreset = DEFAULT_PRIMARY) {
  return createTheme({
    primaryColor,
    primaryShade: { light: 7, dark: 5 },
    colors: customColors,
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    headings: { fontWeight: '600' },
    defaultRadius: 'md',
    cursorType: 'pointer',
    components: {
      // Objetivos táctiles >= 44px en mobile (WCAG 2.2 / uso desde el celular).
      Button: { defaultProps: { size: 'md' } },
      ActionIcon: { defaultProps: { size: 'lg', variant: 'subtle' } },
    },
  });
}
