import type { EventType, LocalDateTime } from './calendar';
import { api } from './http';

export const MINISTRY_KINDS = ['general', 'worship', 'tech', 'kids', 'ushers'] as const;
export type MinistryKind = (typeof MINISTRY_KINDS)[number];
export const MEMBER_ROLES = ['leader', 'coleader', 'servant'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export interface PersonRef {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface MinistryListItem {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  kind: MinistryKind;
  isActive: boolean;
  campus: { id: number; name: string } | null;
  memberCount: number;
  leaders: (PersonRef & { role: MemberRole })[];
}

export interface ServiceRole {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MinistryMember {
  id: number;
  role: MemberRole;
  joinedAt: string;
  person: PersonRef;
}

export interface Ministry {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  kind: MinistryKind;
  isActive: boolean;
  createdAt: string;
  campus: { id: number; name: string } | null;
  members: MinistryMember[];
  roles: ServiceRole[];
  canManage: boolean;
  /** Nombrar o sacar líderes (gestiona todos los ministerios). */
  canManageLeaders: boolean;
  canDelete: boolean;
}

export interface MinistryInput {
  name: string;
  description?: string | null;
  color?: string | null;
  kind?: MinistryKind;
  campusId?: number | null;
  isActive?: boolean;
}

export const ministriesApi = {
  list: (includeInactive = false) =>
    api.get<{ items: MinistryListItem[]; canCreate: boolean }>('/ministries', { includeInactive }),
  get: (id: number) => api.get<Ministry>(`/ministries/${id}`),
  create: (body: MinistryInput & { withDefaultRoles?: boolean; leaderPersonId?: number | null }) =>
    api.post<Ministry>('/ministries', body),
  update: (id: number, body: Partial<MinistryInput>) => api.patch<Ministry>(`/ministries/${id}`, body),
  remove: (id: number) => api.delete(`/ministries/${id}`),
  addMember: (id: number, body: { personId: number; role: MemberRole }) =>
    api.post<Ministry>(`/ministries/${id}/members`, body),
  setMemberRole: (id: number, memberId: number, role: MemberRole) =>
    api.patch<Ministry>(`/ministries/${id}/members/${memberId}`, { role }),
  removeMember: (id: number, memberId: number) =>
    api.delete<Ministry>(`/ministries/${id}/members/${memberId}`),
  addRole: (id: number, name: string) => api.post<Ministry>(`/ministries/${id}/service-roles`, { name }),
  updateRole: (id: number, roleId: number, body: { name?: string; isActive?: boolean }) =>
    api.patch<Ministry>(`/ministries/${id}/service-roles/${roleId}`, body),
  reorderRoles: (id: number, ids: number[]) =>
    api.put<Ministry>(`/ministries/${id}/service-roles/order`, { ids }),
  removeRole: (id: number, roleId: number) =>
    api.delete<Ministry>(`/ministries/${id}/service-roles/${roleId}`),
};

// ── Turnos ────────────────────────────────────────────────────────────────
export type AssignmentStatus = 'pending' | 'accepted' | 'declined';

export interface ScheduleAssignment {
  id: number;
  serviceRoleId: number;
  status: AssignmentStatus;
  declineReason: string | null;
  notes: string | null;
  person: PersonRef;
}

export interface ScheduleOccurrence {
  eventId: number;
  title: string;
  type: EventType;
  startsAt: LocalDateTime;
  endsAt: LocalDateTime;
  originalStart: LocalDateTime;
  cancelled: boolean;
  assignments: ScheduleAssignment[];
}

export interface Schedule {
  from: string;
  to: string;
  ministry: { id: number; name: string; color: string | null };
  canAssign: boolean;
  roles: { id: number; name: string; isActive: boolean }[];
  members: (PersonRef & { role: MemberRole })[];
  occurrences: ScheduleOccurrence[];
  unavailability: { personId: number; fromDate: string; toDate: string; reason: string | null }[];
  /** Turnos de los integrantes en otros ministerios (para advertir). */
  elsewhere: {
    personId: number;
    eventId: number;
    occurrence: LocalDateTime;
    ministry: string;
    role: string;
  }[];
}

export type AssignmentWarning =
  | { code: 'UNAVAILABLE'; reason: string | null }
  | { code: 'ALREADY_ASSIGNED'; ministry: string; role: string };

export interface MyAssignment {
  id: number;
  status: AssignmentStatus;
  declineReason: string | null;
  notes: string | null;
  ministry: { id: number; name: string; color: string | null };
  role: string;
  event: { id: number; title: string; type: EventType; location: string | null; allDay: boolean };
  occurrence: LocalDateTime;
  startsAt: LocalDateTime;
  endsAt: LocalDateTime;
  cancelled: boolean;
  team: { role: string; status: AssignmentStatus; person: PersonRef }[];
}

export interface Unavailability {
  id: number;
  fromDate: string;
  toDate: string;
  reason: string | null;
}

export const assignmentsApi = {
  schedule: (ministryId: number, q: { from: string; to: string; types: string }) =>
    api.get<Schedule>(`/ministries/${ministryId}/schedule`, q),
  assign: (
    ministryId: number,
    body: { eventId: number; occurrence: LocalDateTime; serviceRoleId: number; personId: number },
  ) => api.post<{ id: number; warnings: AssignmentWarning[] }>(`/ministries/${ministryId}/assignments`, body),
  unassign: (ministryId: number, id: number) => api.delete(`/ministries/${ministryId}/assignments/${id}`),
  mine: () => api.get<{ linked: boolean; items: MyAssignment[] }>('/me/assignments'),
  respond: (id: number, response: 'accept' | 'decline', reason?: string | null) =>
    api.post<{ linked: boolean; items: MyAssignment[] }>(`/me/assignments/${id}/respond`, {
      response,
      reason,
    }),
  unavailability: () => api.get<{ linked: boolean; items: Unavailability[] }>('/me/unavailability'),
  addUnavailability: (body: { fromDate: string; toDate: string; reason: string | null }) =>
    api.post<{ conflicts: number; linked: boolean; items: Unavailability[] }>('/me/unavailability', body),
  removeUnavailability: (id: number) =>
    api.delete<{ linked: boolean; items: Unavailability[] }>(`/me/unavailability/${id}`),
};
