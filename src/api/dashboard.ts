import type { Occurrence } from './calendar';
import { api } from './http';

export const DASHBOARD_PERIODS = ['7d', '30d', '90d'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** Valor del período elegido y del período anterior de la misma duración. */
export interface Compared<T = number> {
  current: T;
  previous: T;
}

export interface Dashboard {
  period: DashboardPeriod;
  current: { from: string; to: string };
  previous: { from: string; to: string };
  people: { total: number; members: number; visitors: number; added: Compared } | null;
  newcomers: { pending: number } | null;
  consolidation: { open: number; overdue: number; unassigned: number; completed: Compared } | null;
  cells: {
    active: number;
    /** null sin permiso para ver reportes. */
    meetings: {
      held: Compared;
      avgAttendance: Compared<number | null>;
      visitors: Compared;
    } | null;
  } | null;
  attendance: {
    avgInPerson: Compared<number | null>;
    avgOnline: Compared<number | null>;
    newcomers: Compared;
    pending: number;
  } | null;
  finance: {
    totals: { currency: string; income: Compared; expense: Compared; net: Compared }[];
    pendingOfferings: number;
  } | null;
  upcoming: Occurrence[] | null;
}

export const dashboardApi = {
  get: (period: DashboardPeriod) => api.get<Dashboard>('/dashboard', { period }),
};
