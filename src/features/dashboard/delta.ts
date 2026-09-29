import type { Compared } from '../../api/dashboard';

export type Trend = 'up' | 'down' | 'flat';

export interface Delta {
  trend: Trend;
  /** Variación porcentual redondeada; null si el período anterior fue 0 o no hay datos. */
  percent: number | null;
}

/** Variación del período contra el anterior. Sin datos en alguno de los dos, no hay comparación. */
export function delta({ current, previous }: Compared<number | null>): Delta | null {
  if (current === null || previous === null) return null;
  if (current === previous) return { trend: 'flat', percent: 0 };
  const trend = current > previous ? 'up' : 'down';
  if (previous === 0) return { trend, percent: null };
  return { trend, percent: Math.round(((current - previous) / Math.abs(previous)) * 100) };
}

/** Color de la variación: subir es bueno salvo en los egresos (invert). */
export function trendColor(trend: Trend, invert = false) {
  if (trend === 'flat') return 'gray';
  return (trend === 'up') !== invert ? 'teal' : 'red';
}
