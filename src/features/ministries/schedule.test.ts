import { describe, expect, it } from 'vitest';
import type { ScheduleAssignment, ScheduleOccurrence } from '../../api/ministries';
import { coverage, warningsFor } from './schedule';

const person = (id: number) => ({ id, firstName: `P${id}`, lastName: 'X', phone: null });
const assignment = (
  id: number,
  roleId: number,
  personId: number,
  status = 'pending',
): ScheduleAssignment => ({
  id,
  serviceRoleId: roleId,
  status: status as ScheduleAssignment['status'],
  declineReason: null,
  notes: null,
  person: person(personId),
});
const occurrence: ScheduleOccurrence = {
  eventId: 7,
  title: 'Culto',
  type: 'service',
  startsAt: '2026-10-04T10:00',
  endsAt: '2026-10-04T12:00',
  originalStart: '2026-10-04T10:00',
  cancelled: false,
  assignments: [assignment(1, 10, 1), assignment(2, 11, 2, 'declined')],
};
const schedule = {
  roles: [
    { id: 10, name: 'Voz', isActive: true },
    { id: 11, name: 'Bajo', isActive: true },
    { id: 12, name: 'Teclado', isActive: false },
  ],
  unavailability: [{ personId: 3, fromDate: '2026-10-01', toDate: '2026-10-05', reason: 'Viaje' }],
  elsewhere: [
    { personId: 3, eventId: 7, occurrence: '2026-10-04T10:00', ministry: 'Técnica', role: 'Sonido' },
    { personId: 3, eventId: 7, occurrence: '2026-10-11T10:00', ministry: 'Técnica', role: 'Sonido' },
  ],
};

describe('grilla de turnos', () => {
  it('advierte no disponibilidad, otro puesto en la fecha y otro ministerio', () => {
    expect(warningsFor(schedule, occurrence, 1)).toEqual([{ code: 'sameDate', role: 'Voz' }]);
    // Un turno rechazado no cuenta.
    expect(warningsFor(schedule, occurrence, 2)).toEqual([]);
    expect(warningsFor(schedule, occurrence, 3)).toEqual([
      { code: 'unavailable', reason: 'Viaje' },
      { code: 'elsewhere', ministry: 'Técnica', role: 'Sonido' },
    ]);
  });

  it('cobertura: puestos activos con alguien que no rechazó', () => {
    expect(coverage(schedule, occurrence)).toEqual({ covered: 1, total: 2 });
  });
});
