import type { Occurrence } from '../../api/calendar';

// Fechas del calendario como texto ISO ("YYYY-MM-DD"), sin zona horaria: los eventos vienen en la
// hora local de la iglesia y se muestran tal cual.

export type CalendarView = 'month' | 'week' | 'agenda';

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export const weekdayOf = (iso: string) => toDate(iso).getUTCDay();

/** Primer día de la semana que contiene `iso` (weekStartsOn: 0 = domingo, 1 = lunes). */
export function startOfWeek(iso: string, weekStartsOn: number) {
  return addDays(iso, -((weekdayOf(iso) - weekStartsOn + 7) % 7));
}

export function addMonths(iso: string, months: number) {
  const d = toDate(`${iso.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toIso(d);
}

/** Semanas completas (de 7 días) que cubren el mes de `iso`. */
export function monthGrid(iso: string, weekStartsOn: number): string[][] {
  const first = `${iso.slice(0, 7)}-01`;
  const last = addDays(addMonths(first, 1), -1);
  const weeks: string[][] = [];
  for (let day = startOfWeek(first, weekStartsOn); day <= last; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
  }
  return weeks;
}

/** Período a pedir a la API para cada vista. La agenda muestra 4 semanas desde el día elegido. */
export function rangeFor(view: CalendarView, anchor: string, weekStartsOn: number) {
  if (view === 'month') {
    const weeks = monthGrid(anchor, weekStartsOn);
    return { from: weeks[0]![0]!, to: weeks.at(-1)![6]! };
  }
  if (view === 'week') {
    const from = startOfWeek(anchor, weekStartsOn);
    return { from, to: addDays(from, 6) };
  }
  return { from: anchor, to: addDays(anchor, 27) };
}

/** Día siguiente o anterior "de la vista": un mes, una semana o 4 semanas. */
export function shift(view: CalendarView, anchor: string, direction: 1 | -1) {
  if (view === 'month') return addMonths(anchor, direction);
  return addDays(anchor, direction * (view === 'week' ? 7 : 28));
}

export const dayOf = (local: string) => local.slice(0, 10);
export const timeOf = (local: string) => local.slice(11, 16);

/** Fechas que tocan cada día (un evento de varios días aparece en todos). */
export function byDay(items: Occurrence[], days: string[]) {
  const map = new Map<string, Occurrence[]>(days.map((d) => [d, []]));
  for (const o of items) {
    for (const d of days) {
      if (dayOf(o.startsAt) <= d && dayOf(o.endsAt) >= d) map.get(d)!.push(o);
    }
  }
  return map;
}
