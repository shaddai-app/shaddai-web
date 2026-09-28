import type { Paged } from './admin';
import { api } from './http';

// ── Estructura: redes y zonas ──────────────────────────────────────────────
export interface PersonRef {
  id: number;
  firstName: string;
  lastName: string;
  photoFileId: number | null;
}

export interface Network {
  id: number;
  name: string;
  color: string | null;
  isActive: boolean;
  campus: { id: number; name: string } | null;
  leader: PersonRef | null;
  zoneCount: number;
}

export interface NetworkInput {
  name: string;
  color: string | null;
  campusId: number | null;
  leaderPersonId: number | null;
  isActive: boolean;
}

export interface Zone {
  id: number;
  name: string;
  isActive: boolean;
  network: { id: number; name: string; color: string | null };
  supervisor: PersonRef | null;
  cellCount: number;
}

export interface ZoneInput {
  name: string;
  networkId: number;
  supervisorPersonId: number | null;
  isActive: boolean;
}

export const networksApi = {
  list: () => api.get<{ items: Network[] }>('/networks'),
  create: (body: Partial<NetworkInput> & { name: string }) => api.post<{ id: number }>('/networks', body),
  update: (id: number, body: Partial<NetworkInput>) => api.patch<{ id: number }>(`/networks/${id}`, body),
  remove: (id: number) => api.delete(`/networks/${id}`),
};

export const zonesApi = {
  list: (networkId?: number) => api.get<{ items: Zone[] }>('/zones', { networkId }),
  create: (body: Partial<ZoneInput> & { name: string; networkId: number }) =>
    api.post<{ id: number }>('/zones', body),
  update: (id: number, body: Partial<ZoneInput>) => api.patch<{ id: number }>(`/zones/${id}`, body),
  remove: (id: number) => api.delete(`/zones/${id}`),
};

// ── Células ────────────────────────────────────────────────────────────────
export const CELL_STATUSES = ['active', 'paused', 'closed', 'multiplied'] as const;
export type CellStatus = (typeof CELL_STATUSES)[number];

export interface CellPersonRef extends PersonRef {
  phone: string | null;
}

export interface CellListItem {
  id: number;
  code: string | null;
  name: string;
  status: CellStatus;
  /** 0 = domingo … 6 = sábado */
  meetingDay: number;
  /** "HH:mm" */
  meetingTime: string;
  city: string | null;
  neighborhood: string | null;
  startedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  campus: { id: number; name: string } | null;
  zone: { id: number; name: string; network: { id: number; name: string; color: string | null } };
  leader: CellPersonRef;
  coLeader: CellPersonRef | null;
  host: CellPersonRef | null;
  parentCell: { id: number; name: string } | null;
  memberCount: number;
  // Solo con celulas.ver_direccion:
  address?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface CellMember extends CellPersonRef {
  birthDate: string | null;
  joinedAt: string | null;
  status: { id: number; systemKey: string | null; name: string | null; color: string | null } | null;
}

/** Lo que devuelven alta, edición, cierre e integrantes (sin los datos de reportes). */
export interface CellCore extends CellListItem {
  members: CellMember[];
  children: { id: number; name: string; status: CellStatus }[];
  access: { edit: boolean; address: boolean; report: boolean; multiply: boolean; close: boolean };
}

/** GET /cells/:id: la célula más progreso de multiplicación y último reporte. */
export interface CellDetail extends CellCore {
  multiplication: { target: number; members: number; progress: number; ready: boolean };
  lastReport: { id: number; meetingDate: string; held: boolean } | null;
  reportEditDays: number;
  today: string;
}

export interface CellInput {
  name: string;
  code: string | null;
  zoneId: number;
  campusId: number | null;
  meetingDay: number;
  meetingTime: string;
  address: string;
  city: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  leaderPersonId: number;
  coLeaderPersonId: number | null;
  hostPersonId: number | null;
  startedAt: string | null;
}

export interface CellsQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  zoneId?: number;
  networkId?: number;
  status?: CellStatus;
  meetingDay?: number;
  mine?: boolean;
}

export interface CellMapItem {
  id: number;
  name: string;
  status: CellStatus;
  meetingDay: number;
  meetingTime: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  /** Punto redondeado (~1 km) porque el usuario no puede ver la dirección exacta. */
  approximate: boolean;
  zone: { id: number; name: string; network: { id: number; name: string; color: string | null } };
  leader: { id: number; firstName: string; lastName: string };
}

export const cellsApi = {
  list: (q: CellsQuery) => api.get<Paged<CellListItem>>('/cells', { ...q }),
  map: (q: { zoneId?: number; networkId?: number } = {}) =>
    api.get<{ items: CellMapItem[] }>('/cells/map', { ...q }),
  get: (id: number) => api.get<CellDetail>(`/cells/${id}`),
  create: (body: Partial<CellInput>) => api.post<CellCore>('/cells', body),
  update: (id: number, body: Partial<CellInput> & { status?: 'active' | 'paused' | 'closed' }) =>
    api.patch<CellCore>(`/cells/${id}`, body),
  close: (id: number) => api.delete<CellCore>(`/cells/${id}`),
  addMember: (id: number, personId: number, move = false) =>
    api.post<CellCore>(`/cells/${id}/members`, { personId, move }),
  removeMember: (id: number, personId: number) => api.delete<CellCore>(`/cells/${id}/members/${personId}`),
};

// ── Geocodificación ────────────────────────────────────────────────────────
export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

export const geocodeApi = {
  status: () => api.get<{ enabled: boolean }>('/geocode/status'),
  search: (q: string) => api.post<{ items: GeocodeResult[] }>('/geocode', { q }),
};

// ── Reportes semanales ─────────────────────────────────────────────────────
export interface NewVisitor {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface ReportInput {
  /** "YYYY-MM-DD" */
  meetingDate: string;
  held: boolean;
  notHeldReason: string | null;
  topic: string | null;
  anonymousVisitors: number;
  childrenCount: number;
  offeringAmount: number | null;
  notes: string | null;
  /** Integrantes presentes. */
  attendance: number[];
  /** Visitas que ya tienen ficha. */
  visitors: number[];
  /** Visitas nuevas (se crean como personas y entran a consolidación). */
  newVisitors: NewVisitor[];
}

export interface ReportTotals {
  members: number;
  visitors: number;
  children: number;
  total: number;
}

export interface CellReportListItem {
  id: number;
  cellId: number;
  meetingDate: string;
  held: boolean;
  notHeldReason: string | null;
  topic: string | null;
  anonymousVisitors: number;
  childrenCount: number;
  offeringAmount: number | null;
  /** Estado de la ofrenda en tesorería (null: sin ofrenda). */
  offeringStatus: 'pending' | 'confirmed' | 'rejected' | null;
  notes: string | null;
  submittedById: number;
  submittedAt: string;
  updatedAt: string;
  cell: { id: number; name: string; zone: { id: number; name: string } };
  totals: ReportTotals;
}

type ReportPerson = { id: number; firstName: string; lastName: string; photoFileId: number | null };

export interface CellReport extends CellReportListItem {
  attendance: ReportPerson[];
  visitors: ReportPerson[];
  access: { edit: boolean };
}

export const reportsApi = {
  listForCell: (cellId: number, q: { page?: number; pageSize?: number } = {}) =>
    api.get<Paged<CellReportListItem>>(`/cells/${cellId}/reports`, { ...q }),
  get: (id: number) => api.get<CellReport>(`/cell-reports/${id}`),
  create: (cellId: number, body: ReportInput) => api.post<CellReport>(`/cells/${cellId}/reports`, body),
  update: (id: number, body: Partial<ReportInput>) => api.patch<CellReport>(`/cell-reports/${id}`, body),
  remove: (id: number) => api.delete(`/cell-reports/${id}`),
};

// ── Semáforo de reportes ───────────────────────────────────────────────────
export const COMPLIANCE_STATUSES = ['reported', 'not_held', 'pending', 'missing', 'upcoming'] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export interface ComplianceItem {
  cell: { id: number; name: string; meetingDay: number; meetingTime: string };
  zone: { id: number; name: string; network: { id: number; name: string; color: string | null } };
  leader: { id: number; firstName: string; lastName: string; phone: string | null };
  /** Fecha en que debía reunirse esa semana. */
  expectedDate: string;
  status: ComplianceStatus;
  /** Se envió pasados los días de tolerancia. */
  late: boolean;
  report: { id: number; meetingDate: string; totals: ReportTotals } | null;
}

export interface Compliance {
  week: { start: string; end: string };
  summary: {
    cells: number;
    reported: number;
    notHeld: number;
    pending: number;
    missing: number;
    upcoming: number;
    /** % de reportes enviados entre las células que ya debían reportar (null si ninguna). */
    rate: number | null;
    attendance: number;
    visitors: number;
  };
  items: ComplianceItem[];
}

export const complianceApi = {
  get: (q: { week?: string; zoneId?: number; networkId?: number }) =>
    api.get<Compliance>('/cell-reports/compliance', { ...q }),
};

// ── Multiplicación y genealogía ────────────────────────────────────────────
export interface MultiplyInput {
  name: string;
  zoneId?: number;
  meetingDay: number;
  meetingTime: string;
  address: string;
  city: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  leaderPersonId: number;
  coLeaderPersonId: number | null;
  hostPersonId: number | null;
  /** Integrantes de la madre que pasan a la nueva (líder, colíder y anfitrión pasan siempre). */
  memberIds: number[];
  date?: string;
  notes: string | null;
}

export interface GenealogyNode {
  id: number;
  name: string;
  status: CellStatus;
  /** null si es raíz (o si la madre está fuera del alcance del usuario). */
  parentCellId: number | null;
  startedAt: string | null;
  closedAt: string | null;
  multipliedAt: string | null;
  memberCount: number;
  childCount: number;
  leader: { id: number; firstName: string; lastName: string };
  zone: { id: number; name: string; network: { id: number; name: string; color: string | null } };
}

export const multiplicationApi = {
  multiply: (motherId: number, body: MultiplyInput) =>
    api.post<{ id: number; name: string; parentCellId: number; visible: boolean }>(
      `/cells/${motherId}/multiply`,
      body,
    ),
  genealogy: () => api.get<{ items: GenealogyNode[] }>('/cells/genealogy'),
};

// ── Célula más cercana (para derivar a alguien nuevo) ─────────────────────
export interface NearestCell {
  id: number;
  name: string;
  meetingDay: number;
  meetingTime: string;
  neighborhood: string | null;
  city: string | null;
  distanceKm: number;
  leader: { id: number; firstName: string; lastName: string; phone: string | null };
  zone: { name: string; network: { name: string } };
}

export const nearestApi = {
  forPerson: (personId: number, limit = 3) =>
    api.get<{ items: NearestCell[] }>('/cells/nearest', { personId, limit }),
};
