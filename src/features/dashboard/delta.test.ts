import { describe, expect, it } from 'vitest';
import { delta, trendColor } from './delta';

describe('comparación con el período anterior', () => {
  it('calcula la variación porcentual', () => {
    expect(delta({ current: 120, previous: 100 })).toEqual({ trend: 'up', percent: 20 });
    expect(delta({ current: 75, previous: 100 })).toEqual({ trend: 'down', percent: -25 });
    expect(delta({ current: 5, previous: 5 })).toEqual({ trend: 'flat', percent: 0 });
    // Neto negativo que mejora.
    expect(delta({ current: -100, previous: -200 })).toEqual({ trend: 'up', percent: 50 });
  });

  it('sin base para comparar', () => {
    expect(delta({ current: 3, previous: 0 })).toEqual({ trend: 'up', percent: null });
    expect(delta({ current: null, previous: 10 })).toBeNull();
    expect(delta({ current: 10, previous: null })).toBeNull();
  });

  it('en los egresos subir es malo', () => {
    expect(trendColor('up')).toBe('teal');
    expect(trendColor('up', true)).toBe('red');
    expect(trendColor('down', true)).toBe('teal');
    expect(trendColor('flat')).toBe('gray');
  });
});
