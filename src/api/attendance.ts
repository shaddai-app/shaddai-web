import type { EventType, LocalDateTime } from './calendar';
import { api, apiRequest } from './http';

export interface AttendanceCounts {
  adults: number;
  children: number;
  /** Primera vez (ya incluidos en adultos/niños). */
  newcomers: number;
  online: number;
  notes: string | null;
}

export interface Attendance extends AttendanceCounts {
  /** adultos + niños */
  inPerson: number;
  updatedAt: string;
}

export interface AttendanceItem {
  key: string;
  eventId: number;
  title: string;
  type: EventType;
  startsAt: LocalDateTime;
  originalStart: LocalDateTime;
  cancelled: boolean;
  /** Culto que ya pasó sin asistencia cargada. */
  pending: boolean;
  attendance: Attendance | null;
}

export interface AttendanceSummary {
  recorded: number;
  pending: number;
  avgInPerson: number | null;
  avgAdults: number | null;
  avgChildren: number | null;
  avgOnline: number | null;
  newcomers: number;
  peak: { title: string; startsAt: LocalDateTime; inPerson: number } | null;
}

export interface AttendanceList {
  from: string;
  to: string;
  items: AttendanceItem[];
  summary: AttendanceSummary;
}

export interface OccurrenceAttendance {
  event: { id: number; title: string; type: EventType; location: string | null };
  occurrence: LocalDateTime;
  startsAt: LocalDateTime;
  endsAt: LocalDateTime;
  cancelled: boolean;
  /** Ya empezó (solo entonces se puede cargar). */
  started: boolean;
  attendance: Attendance | null;
}

const path = (eventId: number, occurrence: LocalDateTime) => `/events/${eventId}/attendance/${occurrence}`;

export const attendanceApi = {
  list: (q: { from: string; to: string }) => api.get<AttendanceList>('/attendance', q),
  exportXlsx: (q: { from: string; to: string }, locale: string) =>
    apiRequest<Blob>('/attendance', { query: { ...q, format: 'xlsx', locale }, blob: true }),
  get: (eventId: number, occurrence: LocalDateTime) =>
    api.get<OccurrenceAttendance>(path(eventId, occurrence)),
  save: (eventId: number, occurrence: LocalDateTime, body: AttendanceCounts) =>
    api.put<OccurrenceAttendance>(path(eventId, occurrence), body),
  remove: (eventId: number, occurrence: LocalDateTime) => api.delete<void>(path(eventId, occurrence)),
};
