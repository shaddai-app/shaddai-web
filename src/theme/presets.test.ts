import { describe, expect, it } from 'vitest';
import { customColors, PRIMARY_PRESETS } from './presets';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe('presets de color', () => {
  it('todos los presets son tuplas propias', () => {
    for (const preset of PRIMARY_PRESETS) expect(customColors[preset]).toHaveLength(10);
  });

  it.each(PRIMARY_PRESETS)(
    '%s: texto blanco AA sobre el botón primario en claro (7) y oscuro (6)',
    (preset) => {
      const tuple = customColors[preset];
      expect(contrastWithWhite(tuple[7])).toBeGreaterThanOrEqual(4.5);
      expect(contrastWithWhite(tuple[6])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('slate es el azul de la marca', () => {
    expect(customColors.slate[7]).toBe('#3b5f94');
  });
});
