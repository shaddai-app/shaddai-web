import { describe, expect, it } from 'vitest';
import type { AttendanceItem } from '../../api/attendance';
import { periodRange, weeklyTotals } from './trend';

const item = (startsAt: string, inPerson: number | null, online = 0): AttendanceItem => ({
  key: startsAt,
  eventId: 1,
  title: 'Culto',
  type: 'service',
  startsAt,
  originalStart: startsAt,
  cancelled: false,
  pending: inPerson === null,
  attendance:
    inPerson === null
      ? null
      : { adults: inPerson, children: 0, newcomers: 0, online, notes: null, inPerson, updatedAt: '' },
});

describe('asistencia', () => {
  it('rangos de los períodos', () => {
    expect(periodRange('4w', '2026-09-28')).toEqual({ from: '2026-09-01', to: '2026-09-28' });
    expect(periodRange('3m', '2026-09-28')).toEqual({ from: '2026-06-28', to: '2026-09-28' });
    expect(periodRange('12m', '2026-09-28')).toEqual({ from: '2025-09-28', to: '2026-09-28' });
  });

  it('suma por semana las reuniones cargadas y saltea las pendientes', () => {
    const weeks = weeklyTotals(
      [
        item('2026-09-27T18:00', 70, 15),
        item('2026-09-27T10:00', 120, 40),
        item('2026-09-20T10:00', 110),
        item('2026-09-20T18:00', null),
      ],
      1,
    );
    expect(weeks).toEqual([
      { week: '2026-09-14', inPerson: 110, online: 0, services: 1 },
      { week: '2026-09-21', inPerson: 190, online: 55, services: 2 },
    ]);
    // Con semanas que empiezan el domingo, cada domingo abre su semana.
    expect(weeklyTotals([item('2026-09-27T10:00', 1)], 0)[0]!.week).toBe('2026-09-27');
  });
});
