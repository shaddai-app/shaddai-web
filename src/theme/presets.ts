import type { MantineColorsTuple } from '@mantine/core';

/**
 * Colores primarios que puede elegir una cuenta. slate es el azul de la marca (#3B5F94); el resto
 * comparte su perfil de saturación y luz (otro tono) para convivir con el marfil y el grafito, con el
 * mismo contraste del texto blanco: AA en shade 7 (claro) y 6 (oscuro). Ver presets.test.ts.
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
  indigo: [
    '#eef0f8',
    '#dcdfee',
    '#b6bcda',
    '#8e97c7',
    '#808abf',
    '#6b77b5',
    '#5c6bb4',
    '#4656a7',
    '#3d4c98',
    '#2f3e8b',
  ],
  teal: [
    '#eff7f7',
    '#ddeced',
    '#b8d6d8',
    '#91c0c3',
    '#529297',
    '#477f83',
    '#3e787d',
    '#306367',
    '#275558',
    '#1c4548',
  ],
  burgundy: [
    '#f8eef1',
    '#eedce1',
    '#dab6bf',
    '#c78e9c',
    '#ba7586',
    '#af6174',
    '#af5169',
    '#9c4158',
    '#8d384d',
    '#7f2b40',
  ],
  graphite: [
    '#f2f3f4',
    '#e3e4e7',
    '#c4c7cc',
    '#a3a8b1',
    '#818893',
    '#717884',
    '#69707d',
    '#585f6a',
    '#4d535e',
    '#3f4550',
  ],
  violet: [
    '#f2eef8',
    '#e4dded',
    '#c6b7d9',
    '#a68fc5',
    '#9b81bd',
    '#8b6db3',
    '#835eb2',
    '#7049a4',
    '#643f96',
    '#573189',
  ],
} satisfies Record<string, MantineColorsTuple>;

export const PRIMARY_PRESETS = ['slate', 'indigo', 'teal', 'burgundy', 'graphite', 'violet'] as const;
export type PrimaryPreset = (typeof PRIMARY_PRESETS)[number];
export const DEFAULT_PRIMARY: PrimaryPreset = 'slate';
