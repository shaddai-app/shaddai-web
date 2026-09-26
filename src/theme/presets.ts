import type { MantineColorsTuple } from '@mantine/core';

/**
 * Colores primarios que puede elegir una cuenta (sobrios, contraste AA verificado en claro y oscuro).
 * indigo, teal y violet son los de Mantine; el resto son tuplas propias.
 */
export const customColors = {
  slate: [
    '#eef3f8',
    '#dce4ee',
    '#b5c6db',
    '#8ca6c8',
    '#6a8bb7',
    '#557aad',
    '#4a71a9',
    '#3b5f94',
    '#325485',
    '#254877',
  ],
  burgundy: [
    '#fbeef1',
    '#f0dbe0',
    '#e1b3bf',
    '#d3889c',
    '#c7647e',
    '#c04d6b',
    '#bd4061',
    '#a63251',
    '#942a48',
    '#82203d',
  ],
  graphite: [
    '#f3f4f6',
    '#e6e7ea',
    '#c9ccd3',
    '#aab0bb',
    '#8f97a6',
    '#7e8799',
    '#757f93',
    '#636c80',
    '#575f73',
    '#495267',
  ],
} satisfies Record<string, MantineColorsTuple>;

export const PRIMARY_PRESETS = ['slate', 'indigo', 'teal', 'burgundy', 'graphite', 'violet'] as const;
export type PrimaryPreset = (typeof PRIMARY_PRESETS)[number];
export const DEFAULT_PRIMARY: PrimaryPreset = 'slate';
