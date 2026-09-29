import type { AssignmentStatus, Schedule, ScheduleOccurrence } from '../../api/ministries';

export const STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending: 'yellow',
  accepted: 'teal',
  declined: 'red',
};

export type ScheduleWarning =
  | { code: 'unavailable'; reason: string | null }
  | { code: 'sameDate'; role: string }
  | { code: 'elsewhere'; ministry: string; role: string };

/**
 * Advertencias al asignar a una persona en una fecha (no bloquean): avisó que no está, ya sirve en
 * otro puesto de este ministerio, o ya sirve en otro ministerio en esa misma fecha.
 */
export function warningsFor(
  schedule: Pick<Schedule, 'roles' | 'unavailability' | 'elsewhere'>,
  occurrence: ScheduleOccurrence,
  personId: number,
): ScheduleWarning[] {
  const day = occurrence.startsAt.slice(0, 10);
  const out: ScheduleWarning[] = [];
  const off = schedule.unavailability.find(
    (u) => u.personId === personId && u.fromDate <= day && u.toDate >= day,
  );
  if (off) out.push({ code: 'unavailable', reason: off.reason });
  for (const a of occurrence.assignments) {
    if (a.person.id !== personId || a.status === 'declined') continue;
    const role = schedule.roles.find((r) => r.id === a.serviceRoleId);
    out.push({ code: 'sameDate', role: role?.name ?? '' });
  }
  for (const e of schedule.elsewhere) {
    if (
      e.personId === personId &&
      e.eventId === occurrence.eventId &&
      e.occurrence === occurrence.originalStart
    ) {
      out.push({ code: 'elsewhere', ministry: e.ministry, role: e.role });
    }
  }
  return out;
}

/** Cuántos puestos activos tienen al menos una persona que no rechazó. */
export function coverage(schedule: Pick<Schedule, 'roles'>, occurrence: ScheduleOccurrence) {
  const active = schedule.roles.filter((r) => r.isActive);
  const covered = active.filter((r) =>
    occurrence.assignments.some((a) => a.serviceRoleId === r.id && a.status !== 'declined'),
  );
  return { covered: covered.length, total: active.length };
}
