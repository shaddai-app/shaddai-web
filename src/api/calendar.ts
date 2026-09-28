import { api, apiRequest } from './http';

export const EVENT_TYPES = ['service', 'meeting', 'special', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];
/** En el calendario también aparecen las reuniones de célula. */
export type OccurrenceType = EventType | 'cell';

/** Horas en hora local de la iglesia: "YYYY-MM-DDTHH:mm". */
export type LocalDateTime = string;

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  /** 0 = domingo … 6 = sábado. */
  weekdays?: number[];
  monthlyBy?: 'day' | 'weekday';
  /** Última fecha incluida (YYYY-MM-DD) o null = sin fin. */
  until?: string | null;
}

export interface Occurrence {
  key: string;
  source: 'event' | 'cell';
  eventId: number | null;
  cellId: number | null;
  type: OccurrenceType;
  title: string;
  location: string | null;
  startsAt: LocalDateTime;
  endsAt: LocalDateTime;
  allDay: boolean;
  recurring: boolean;
  originalStart: LocalDateTime;
  cancelled: boolean;
  moved: boolean;
  note: string | null;
}

export interface EventException {
  originalStart: LocalDateTime;
  cancelled: boolean;
  newStartsAt: LocalDateTime | null;
  newEndsAt: LocalDateTime | null;
  note: string | null;
}

export interface CalendarEvent {
  id: number;
  type: EventType;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: LocalDateTime;
  endsAt: LocalDateTime;
  allDay: boolean;
  recurrence: Recurrence | null;
  campus: { id: number; name: string } | null;
  exceptions: EventException[];
  upcoming: Occurrence[];
  createdBy: { id: number; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
  /** Solo al editar la serie: excepciones descartadas porque ya no caen en una fecha. */
  removedExceptions?: number;
}

export interface EventInput {
  type: EventType;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: LocalDateTime;
  endsAt: LocalDateTime;
  allDay: boolean;
  campusId?: number | null;
  recurrence: Recurrence | null;
}

export const calendarApi = {
  range: (from: string, to: string, types?: OccurrenceType[]) =>
    api.get<{ from: string; to: string; items: Occurrence[] }>('/calendar', {
      from,
      to,
      types: types?.join(','),
    }),
  event: (id: number) => api.get<CalendarEvent>(`/events/${id}`),
  create: (body: EventInput) => api.post<CalendarEvent>('/events', body),
  update: (id: number, body: Partial<EventInput>) => api.patch<CalendarEvent>(`/events/${id}`, body),
  /** "Esta fecha y las siguientes": parte la serie y devuelve el evento nuevo. */
  split: (id: number, occurrence: LocalDateTime, body: Partial<EventInput>) =>
    api.post<CalendarEvent>(`/events/${id}/split`, { occurrence, ...body }),
  remove: (id: number) => api.delete(`/events/${id}`),
  setException: (
    id: number,
    body: {
      originalStart: LocalDateTime;
      cancelled: boolean;
      newStartsAt?: LocalDateTime | null;
      newEndsAt?: LocalDateTime | null;
      note?: string | null;
    },
  ) => api.put<CalendarEvent>(`/events/${id}/exceptions`, body),
  clearException: (id: number, originalStart: LocalDateTime) =>
    apiRequest<CalendarEvent>(`/events/${id}/exceptions`, { method: 'DELETE', query: { originalStart } }),
};
