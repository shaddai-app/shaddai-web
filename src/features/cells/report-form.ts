import dayjs from 'dayjs';
import type { CellReport, NewVisitor, ReportInput } from '../../api/cells';

/** Estado del formulario (serializable: es lo que se guarda como borrador en el celular). */
export interface ReportFormState {
  meetingDate: string;
  held: boolean;
  notHeldReason: string;
  /** Integrantes presentes. */
  attendance: number[];
  /** Visitas con ficha (con nombre, para mostrarlas al recuperar el borrador). */
  visitors: { id: number; firstName: string; lastName: string; phone: string | null }[];
  newVisitors: { firstName: string; lastName: string; phone: string }[];
  anonymousVisitors: number;
  childrenCount: number;
  /** Texto del input ('' = sin ofrenda). */
  offering: string;
  topic: string;
  notes: string;
}

/** Última fecha de reunión (día de la semana de la célula) hasta hoy inclusive. */
export function lastMeetingDate(today: string, meetingDay: number): string {
  const d = dayjs(today);
  return d.subtract((d.day() - meetingDay + 7) % 7, 'day').format('YYYY-MM-DD');
}

export function emptyReport(today: string, meetingDay: number): ReportFormState {
  return {
    meetingDate: lastMeetingDate(today, meetingDay),
    held: true,
    notHeldReason: '',
    attendance: [],
    visitors: [],
    newVisitors: [],
    anonymousVisitors: 0,
    childrenCount: 0,
    offering: '',
    topic: '',
    notes: '',
  };
}

export function fromReport(r: CellReport): ReportFormState {
  return {
    meetingDate: r.meetingDate,
    held: r.held,
    notHeldReason: r.notHeldReason ?? '',
    attendance: r.attendance.map((p) => p.id),
    visitors: r.visitors.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: null,
    })),
    newVisitors: [],
    anonymousVisitors: r.anonymousVisitors,
    childrenCount: r.childrenCount,
    offering: r.offeringAmount === null ? '' : String(r.offeringAmount),
    topic: r.topic ?? '',
    notes: r.notes ?? '',
  };
}

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

/** Visitas nuevas completas (las filas a medio escribir no se mandan). */
export const completeNewVisitors = (s: ReportFormState): NewVisitor[] =>
  s.newVisitors
    .filter((v) => v.firstName.trim() && v.lastName.trim())
    .map((v) => ({ firstName: v.firstName.trim(), lastName: v.lastName.trim(), phone: orNull(v.phone) }));

export function toInput(s: ReportFormState): ReportInput {
  const held = s.held;
  const offering = s.offering.trim() === '' ? null : Number(s.offering.replace(',', '.'));
  return {
    meetingDate: s.meetingDate,
    held,
    notHeldReason: held ? null : orNull(s.notHeldReason),
    topic: held ? orNull(s.topic) : null,
    // Si no hubo reunión no se manda asistencia (la API lo rechaza).
    attendance: held ? s.attendance : [],
    visitors: held ? s.visitors.map((v) => v.id) : [],
    newVisitors: held ? completeNewVisitors(s) : [],
    anonymousVisitors: held ? s.anonymousVisitors : 0,
    childrenCount: held ? s.childrenCount : 0,
    offeringAmount: held && offering !== null && Number.isFinite(offering) ? offering : null,
    notes: orNull(s.notes),
  };
}

export function totals(s: ReportFormState) {
  if (!s.held) return { members: 0, visitors: 0, children: 0, total: 0 };
  const visitors = s.visitors.length + completeNewVisitors(s).length + s.anonymousVisitors;
  return {
    members: s.attendance.length,
    visitors,
    children: s.childrenCount,
    total: s.attendance.length + visitors + s.childrenCount,
  };
}

/** Qué falta para poder enviar (null = listo). */
export function missing(s: ReportFormState): 'date' | 'reason' | null {
  if (!s.meetingDate) return 'date';
  if (!s.held && !s.notHeldReason.trim()) return 'reason';
  return null;
}
