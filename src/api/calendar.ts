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
  /** El evento tiene inscripción. */
  registration: boolean;
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
  registrationEnabled: boolean;
  capacity: number | null;
  waitlistEnabled: boolean;
  /** En la moneda de la iglesia. */
  price: number | null;
  isPublic: boolean;
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
  registrationEnabled?: boolean;
  capacity?: number | null;
  waitlistEnabled?: boolean;
  price?: number | null;
  isPublic?: boolean;
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

// ── Inscripciones ─────────────────────────────────────────────────────────
export type RegistrationStatus = 'confirmed' | 'waitlist' | 'cancelled';

export interface Registration {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: RegistrationStatus;
  source: 'staff' | 'public';
  paidAmount: number | null;
  paymentMovementId: number | null;
  createdAt: string;
  cancelledAt: string | null;
  occurrenceStart: LocalDateTime;
  person: { id: number; firstName: string; lastName: string } | null;
}

export interface Availability {
  capacity: number | null;
  confirmed: number;
  waitlist: number;
  available: number | null;
  full: boolean;
}

export interface RegistrationList extends Availability {
  event: {
    id: number;
    title: string;
    price: number | null;
    waitlistEnabled: boolean;
    registrationEnabled: boolean;
    isPublic: boolean;
  };
  occurrence: {
    originalStart: LocalDateTime;
    startsAt: LocalDateTime;
    endsAt: LocalDateTime;
    cancelled: boolean;
  };
  items: Registration[];
}

export interface RegistrationInput {
  occurrence: LocalDateTime;
  personId?: number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export const registrationsApi = {
  list: (eventId: number, occurrence: LocalDateTime) =>
    api.get<RegistrationList>(`/events/${eventId}/registrations`, { occurrence }),
  exportXlsx: (eventId: number, occurrence: LocalDateTime, locale: string) =>
    apiRequest<Blob>(`/events/${eventId}/registrations`, {
      query: { occurrence, format: 'xlsx', locale },
      blob: true,
    }),
  create: (eventId: number, body: RegistrationInput) =>
    api.post<Registration>(`/events/${eventId}/registrations`, body),
  cancel: (id: number) => api.post<{ promoted: number[] }>(`/registrations/${id}/cancel`),
  pay: (
    id: number,
    body: { financeAccountId: number; amount?: number; paymentMethod: string; date?: string },
  ) => api.post<{ paidAmount: number; movementId: number }>(`/registrations/${id}/payment`, body),
};

// ── Inscripción pública (sin sesión) ──────────────────────────────────────
export interface PublicEventPage {
  church: {
    name: string;
    slug: string;
    logoUrl: string | null;
    defaultLocale: string;
    primaryColor: string;
    currency: string;
  };
  event: {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    allDay: boolean;
    price: number | null;
    dates: {
      occurrence: LocalDateTime;
      startsAt: LocalDateTime;
      endsAt: LocalDateTime;
      full: boolean;
      waitlist: boolean;
      available: number | null;
    }[];
  };
  turnstileSiteKey: string | null;
}

export const publicEventsApi = {
  event: (slug: string, id: number) =>
    api.get<PublicEventPage>(`/public/${slug}/events/${id}`, undefined, { auth: false }),
  register: (
    slug: string,
    id: number,
    body: {
      occurrence: LocalDateTime;
      name: string;
      email: string | null;
      phone: string | null;
      notes: string | null;
      turnstileToken?: string;
      website: string;
    },
  ) =>
    api.post<{ status: RegistrationStatus }>(`/public/${slug}/events/${id}/register`, body, { auth: false }),
};
