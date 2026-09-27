import dayjs from 'dayjs';
import type { ComplianceStatus } from '../../api/cells';

/** Semáforo: verde enviado (o avisó que no hubo reunión), amarillo en tolerancia, rojo falta. */
export const COMPLIANCE_COLORS: Record<ComplianceStatus, string> = {
  reported: 'teal',
  not_held: 'teal',
  pending: 'yellow',
  missing: 'red',
  upcoming: 'gray',
};

/** Orden para listar: primero lo que requiere atención. */
export const COMPLIANCE_ORDER: Record<ComplianceStatus, number> = {
  missing: 0,
  pending: 1,
  upcoming: 2,
  not_held: 3,
  reported: 4,
};

/** Semanas de a una ("YYYY-MM-DD" de cualquier día de la semana → mismo día ± 7). */
export const shiftWeek = (date: string, weeks: number) =>
  dayjs(date)
    .add(weeks * 7, 'day')
    .format('YYYY-MM-DD');
