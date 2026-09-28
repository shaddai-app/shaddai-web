import type { AttendanceItem } from '../../api/attendance';
import { addDays, addMonths, startOfWeek } from '../calendar/dates';

export const PERIODS = ['4w', '3m', '6m', '12m'] as const;
export type Period = (typeof PERIODS)[number];

/** Rango (YYYY-MM-DD) del período que termina hoy. */
export function periodRange(period: Period, today: string) {
  const from =
    period === '4w'
      ? addDays(today, -27)
      : addDays(addMonths(today, -Number(period.slice(0, -1))), Number(today.slice(8, 10)) - 1);
  return { from, to: today };
}

export interface WeekTotal {
  /** Primer día de la semana. */
  week: string;
  inPerson: number;
  online: number;
  services: number;
}

/** Asistencia sumada por semana (todas las reuniones cargadas de esa semana), de la más vieja a la más nueva. */
export function weeklyTotals(items: AttendanceItem[], weekStartsOn: number): WeekTotal[] {
  const weeks = new Map<string, WeekTotal>();
  for (const i of items) {
    if (!i.attendance) continue;
    const week = startOfWeek(i.startsAt.slice(0, 10), weekStartsOn);
    const w = weeks.get(week) ?? { week, inPerson: 0, online: 0, services: 0 };
    w.inPerson += i.attendance.inPerson;
    w.online += i.attendance.online;
    w.services += 1;
    weeks.set(week, w);
  }
  return [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week));
}
