import dayjs from 'dayjs';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { OccurrenceType, Recurrence } from '../../api/calendar';
import { dayOf, timeOf } from './dates';

export const TYPE_COLORS: Record<OccurrenceType, string> = {
  service: 'blue',
  meeting: 'violet',
  special: 'orange',
  other: 'gray',
  cell: 'teal',
};

/** Nombre del día de la semana (0 = domingo) en el idioma activo. */
export const weekdayName = (day: number, format: 'dddd' | 'ddd' | 'dd' = 'dddd') =>
  dayjs('2026-01-04').add(day, 'day').format(format); // el 4/1/2026 es domingo

/** Número de semana del día en el mes: 1…4, o -1 si es la 5.ª (= "el último"). */
export const nthOfMonth = (dayOfMonth: number) => {
  const n = Math.ceil(dayOfMonth / 7);
  return n >= 5 ? -1 : n;
};

/** "Todas las semanas: domingo" / "Todos los meses, el primer domingo, hasta el 30/11/2026". */
export function useRecurrenceText() {
  const { t } = useTranslation('calendar');
  return useCallback(
    (r: Recurrence, startsAt: string) => {
      const start = dayjs(dayOf(startsAt));
      const days = (r.weekdays?.length ? r.weekdays : [start.day()])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => weekdayName(d))
        .join(', ');
      const text =
        r.freq === 'daily'
          ? t('recurrence.describe.daily', { count: r.interval })
          : r.freq === 'weekly'
            ? t('recurrence.describe.weekly', { count: r.interval, days })
            : r.monthlyBy === 'weekday'
              ? t('recurrence.describe.monthlyWeekday', {
                  count: r.interval,
                  nth: t(`recurrence.nth.${nthOfMonth(start.date())}` as 'recurrence.nth.1'),
                  weekday: weekdayName(start.day()),
                })
              : t('recurrence.describe.monthlyDay', { count: r.interval, day: start.date() });
      return r.until
        ? `${text}${t('recurrence.describe.until', { date: dayjs(r.until).format('L') })}`
        : text;
    },
    [t],
  );
}

/** "sáb 17/10 · 18:00 a 20:00" o "9/10 al 11/10 (todo el día)". */
export function useWhenText() {
  const { t } = useTranslation('calendar');
  return useCallback(
    (o: { startsAt: string; endsAt: string; allDay: boolean }) => {
      const sameDay = dayOf(o.startsAt) === dayOf(o.endsAt);
      const date = (local: string) => dayjs(dayOf(local)).format('ddd L');
      if (o.allDay) {
        return sameDay
          ? `${date(o.startsAt)} · ${t('allDay')}`
          : t('range.days', { from: date(o.startsAt), to: date(o.endsAt) });
      }
      return sameDay
        ? `${date(o.startsAt)} · ${t('range.hours', { from: timeOf(o.startsAt), to: timeOf(o.endsAt) })}`
        : t('range.days', {
            from: `${date(o.startsAt)} ${timeOf(o.startsAt)}`,
            to: `${date(o.endsAt)} ${timeOf(o.endsAt)}`,
          });
    },
    [t],
  );
}
