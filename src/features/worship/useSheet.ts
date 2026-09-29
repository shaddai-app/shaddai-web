import { useMemo } from 'react';
import { parseSheet, type Sheet } from './chordpro';

/** La letra interpretada y transpuesta; null si no hay letra o el ChordPro no se puede leer. */
export function useSheet(chordPro: string | null | undefined, key: string | null | undefined, delta: number) {
  return useMemo((): Sheet | null => {
    if (!chordPro) return null;
    try {
      return parseSheet(chordPro, delta, key ?? null);
    } catch {
      return null;
    }
  }, [chordPro, key, delta]);
}
