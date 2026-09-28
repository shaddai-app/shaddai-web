import { describe, expect, it } from 'vitest';
import type { Occurrence } from '../../api/calendar';
import { byDay, monthGrid, rangeFor, shift, startOfWeek } from './dates';

describe('fechas del calendario', () => {
  it('grilla del mes en semanas completas, empezando el día que usa la iglesia', () => {
    const weeks = monthGrid('2026-10-15', 1); // octubre 2026 empieza un jueves
    expect(weeks[0]).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks.at(-1)![6]).toBe('2026-11-01');
    expect(monthGrid('2026-10-15', 0)[0]![0]).toBe('2026-09-27');
  });

  it('período de cada vista y avance', () => {
    expect(startOfWeek('2026-10-15', 1)).toBe('2026-10-12');
    expect(rangeFor('week', '2026-10-15', 1)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(rangeFor('agenda', '2026-10-15', 1)).toEqual({ from: '2026-10-15', to: '2026-11-11' });
    expect(shift('month', '2026-01-31', 1)).toBe('2026-02-01');
    expect(shift('week', '2026-10-15', -1)).toBe('2026-10-08');
  });

  it('un evento de varios días aparece en cada día que toca', () => {
    const retreat = { key: 'r', startsAt: '2026-10-09T00:00', endsAt: '2026-10-11T23:59' } as Occurrence;
    const map = byDay([retreat], ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
    expect([...map.values()].map((l) => l.length)).toEqual([0, 1, 1, 1, 0]);
  });
});
