import type { Paged } from './admin';
import { api } from './http';
import type { CatalogRef } from './people';

// ── Pasos ─────────────────────────────────────────────────────────────────
export interface ConsolidationStep {
  id: number;
  /** Pasos por defecto (nombre traducido si la iglesia no lo renombró). */
  systemKey: string | null;
  name: string | null;
  sortOrder: number;
  /** Días desde la apertura del caso para cumplir el paso. */
  dueDays: number;
  isActive: boolean;
}

export const stepsApi = {
  list: (includeInactive = false) =>
    api.get<{ items: ConsolidationStep[] }>('/consolidation/steps', { includeInactive }),
  create: (body: { name: string; dueDays: number }) =>
    api.post<ConsolidationStep>('/consolidation/steps', body),
  update: (id: number, body: Partial<{ name: string | null; dueDays: number; isActive: boolean }>) =>
    api.patch<ConsolidationStep>(`/consolidation/steps/${id}`, body),
  reorder: (ids: number[]) => api.put<{ items: ConsolidationStep[] }>('/consolidation/steps/order', { ids }),
  remove: (id: number) => api.delete(`/consolidation/steps/${id}`),
};

// ── Casos ─────────────────────────────────────────────────────────────────
export const CASE_STATUSES = ['open', 'completed', 'dropped'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export type CaseSource = 'manual' | 'form' | 'cell';

export interface CasePerson {
  id: number;
  firstName: string;
  lastName: string;
  photoFileId: number | null;
  phone: string | null;
  status: CatalogRef | null;
}

export interface UserRef {
  id: number;
  firstName: string;
  lastName: string;
}

export interface CaseCard {
  id: number;
  status: CaseStatus;
  source: CaseSource;
  openedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  currentStepId: number | null;
  currentStepDueAt: string | null;
  overdue: boolean;
  progress: { done: number; total: number };
  lastFollowUpAt: string | null;
  nextActionAt: string | null;
  person: CasePerson;
  consolidator: UserRef | null;
}

export const FOLLOW_UP_TYPES = ['call', 'visit', 'whatsapp', 'message', 'prayer', 'other'] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export interface FollowUp {
  id: number;
  caseId: number | null;
  type: FollowUpType;
  date: string;
  notes: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  createdAt: string;
  createdBy: UserRef | null;
}

export interface CaseStepState {
  id: number;
  dueAt: string;
  completedAt: string | null;
  completedById: number | null;
  notes: string | null;
  overdue: boolean;
  step: ConsolidationStep;
}

export interface CaseDetail extends CaseCard {
  steps: CaseStepState[];
  followUps: FollowUp[];
  access: { manage: boolean; assign: boolean };
}

export interface Board {
  columns: { step: ConsolidationStep; cases: CaseCard[] }[];
  /** Casos cuyo paso actual se desactivó: se muestran aparte para no perderlos. */
  unplaced: CaseCard[];
  summary: { open: number; overdue: number; unassigned: number };
}

export interface BoardQuery {
  consolidatorUserId?: number;
  mine?: boolean;
  unassigned?: boolean;
}

export interface CasesQuery extends BoardQuery {
  page?: number;
  pageSize?: number;
  status?: CaseStatus;
  q?: string;
  overdue?: boolean;
  personId?: number;
}

export interface FollowUpInput {
  type: FollowUpType;
  date?: string;
  notes?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
}

export interface MyTasks {
  actions: {
    followUpId: number;
    person: {
      id: number;
      firstName: string;
      lastName: string;
      phone: string | null;
      photoFileId: number | null;
    };
    nextAction: string | null;
    nextActionAt: string;
    overdue: boolean;
  }[];
  overdueCases: CaseCard[];
}

export const casesApi = {
  board: (q: BoardQuery = {}) => api.get<Board>('/consolidation/board', { ...q }),
  list: (q: CasesQuery = {}) => api.get<Paged<CaseCard>>('/consolidation/cases', { ...q }),
  get: (id: number) => api.get<CaseDetail>(`/consolidation/cases/${id}`),
  open: (body: { personId: number; consolidatorUserId?: number | null }) =>
    api.post<CaseDetail>('/consolidation/cases', body),
  assign: (id: number, consolidatorUserId: number | null) =>
    api.patch<CaseDetail>(`/consolidation/cases/${id}/assign`, { consolidatorUserId }),
  setStatus: (id: number, body: { status: CaseStatus; closeReason?: string | null }) =>
    api.patch<CaseDetail>(`/consolidation/cases/${id}`, body),
  move: (id: number, stepId: number) => api.post<CaseDetail>(`/consolidation/cases/${id}/move`, { stepId }),
  complete: (id: number, stepId: number, notes?: string | null) =>
    api.post<CaseDetail>(`/consolidation/cases/${id}/steps/${stepId}/complete`, { notes }),
  undo: (id: number, stepId: number) =>
    api.post<CaseDetail>(`/consolidation/cases/${id}/steps/${stepId}/undo`),
  consolidators: () => api.get<{ items: (UserRef & { email: string })[] }>('/consolidation/consolidators'),
  followUps: (personId: number) => api.get<{ items: FollowUp[] }>(`/people/${personId}/follow-ups`),
  addFollowUp: (personId: number, body: FollowUpInput) =>
    api.post<{ items: FollowUp[] }>(`/people/${personId}/follow-ups`, body),
  removeFollowUp: (id: number) => api.delete(`/follow-ups/${id}`),
  myTasks: () => api.get<MyTasks>('/me/consolidation/tasks'),
};
