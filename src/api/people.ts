import type { Paged } from './admin';
import { api } from './http';

// ── Catálogos, etiquetas y sedes ───────────────────────────────────────────
export const CATALOG_TYPES = [
  'person_status',
  'milestone',
  'position',
  'inventory_category',
  'event_type',
] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number];

export interface CatalogRef {
  id: number;
  systemKey: string | null;
  name: string | null;
  color: string | null;
}

export interface CatalogItem extends CatalogRef {
  type: CatalogType;
  sortOrder: number;
  isActive: boolean;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  peopleCount?: number;
}

export interface Campus {
  id: number;
  name: string;
  isMain: boolean;
  address: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
}

export const catalogsApi = {
  list: (type: CatalogType, includeInactive = false) =>
    api.get<{ items: CatalogItem[] }>(`/catalogs/${type}`, { includeInactive }),
  create: (type: CatalogType, body: { name: string; color?: string | null }) =>
    api.post<CatalogItem>(`/catalogs/${type}`, body),
  update: (
    type: CatalogType,
    id: number,
    body: Partial<{ name: string | null; color: string | null; isActive: boolean }>,
  ) => api.patch<CatalogItem>(`/catalogs/${type}/${id}`, body),
  reorder: (type: CatalogType, ids: number[]) =>
    api.put<{ items: CatalogItem[] }>(`/catalogs/${type}/order`, { ids }),
  remove: (type: CatalogType, id: number) => api.delete(`/catalogs/${type}/${id}`),
};

export const tagsApi = {
  list: () => api.get<{ items: Tag[] }>('/tags'),
  create: (body: { name: string; color?: string | null }) => api.post<Tag>('/tags', body),
  update: (id: number, body: Partial<{ name: string; color: string | null }>) =>
    api.patch<Tag>(`/tags/${id}`, body),
  remove: (id: number) => api.delete(`/tags/${id}`),
};

export type CampusInput = Omit<Campus, 'id'>;

export const campusesApi = {
  list: () => api.get<{ items: Campus[] }>('/campuses'),
  create: (body: Partial<CampusInput> & { name: string }) => api.post<Campus>('/campuses', body),
  update: (id: number, body: Partial<CampusInput>) => api.patch<Campus>(`/campuses/${id}`, body),
};

// ── Personas ───────────────────────────────────────────────────────────────
export type Gender = 'F' | 'M';
export const MARITAL_STATUSES = ['single', 'married', 'widowed', 'divorced', 'separated'] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];
export const HOUSEHOLD_ROLES = ['head', 'spouse', 'child', 'other'] as const;
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

export interface PersonListItem {
  id: number;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  photoFileId: number | null;
  gender: Gender | null;
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  status: CatalogRef;
  campus: { id: number; name: string } | null;
  household: { id: number; name: string } | null;
  tags: Tag[];
}

export interface HouseholdMember {
  id: number;
  firstName: string;
  lastName: string;
  householdRole: HouseholdRole | null;
  birthDate: string | null;
  photoFileId: number | null;
  phone?: string | null;
  email?: string | null;
}

export interface PersonDetail extends Omit<PersonListItem, 'household'> {
  householdRole: HouseholdRole | null;
  city: string | null;
  province: string | null;
  source: 'manual' | 'form' | 'import' | 'cell';
  firstVisitAt: string | null;
  consentAt: string | null;
  consentVersion: string | null;
  notes: string | null;
  createdById: number | null;
  updatedAt: string;
  household: { id: number; name: string; members: HouseholdMember[] } | null;
  milestones: { id: number; type: CatalogRef; date: string; notes: string | null }[];
  positions: { id: number; position: CatalogRef; since: string | null; until: string | null }[];
  /** Solo con usuarios.ver (undefined = sin permiso para saberlo). */
  user?: { id: number; email: string; isActive: boolean } | null;
  // Sensibles: solo vienen con personas.ver_sensibles.
  documentNumber?: string | null;
  maritalStatus?: MaritalStatus | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  pastoralNotes?: string | null;
  access: { edit: boolean; sensitive: boolean; delete: boolean; merge: boolean };
}

export interface PeopleQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  statusId?: string; // "1,2,3"
  campusId?: number;
  tagId?: number;
  householdId?: number;
  gender?: Gender;
  sort?: 'name' | 'recent';
}

export interface PersonInput {
  firstName: string;
  lastName: string;
  preferredName: string | null;
  gender: Gender | null;
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  campusId: number | null;
  firstVisitAt: string | null;
  notes: string | null;
  // Sensibles (solo se mandan si el usuario puede verlos).
  documentNumber?: string | null;
  maritalStatus?: MaritalStatus | null;
  address?: string | null;
  pastoralNotes?: string | null;
}

export type DuplicateReason = 'email' | 'phone' | 'document' | 'name' | 'name_birthdate';

export interface DuplicateResult {
  items: (PersonListItem & { reasons: DuplicateReason[]; strong: boolean })[];
  hiddenCount: number;
  strong: boolean;
}

export type TimelineItem =
  | { type: 'created'; at: string; source: PersonDetail['source']; by: UserRef | null }
  | { type: 'status'; at: string; from: CatalogRef; to: CatalogRef; note: string | null; by: UserRef | null }
  | { type: 'milestone'; at: string; milestone: CatalogRef; notes: string | null }
  | { type: 'position_start' | 'position_end'; at: string; position: CatalogRef };

export interface UserRef {
  id: number;
  firstName: string;
  lastName: string;
}

export const peopleApi = {
  list: (q: PeopleQuery) => api.get<Paged<PersonListItem>>('/people', { ...q }),
  get: (id: number) => api.get<PersonDetail>(`/people/${id}`),
  timeline: (id: number) => api.get<{ items: TimelineItem[] }>(`/people/${id}/timeline`),
  duplicates: (q: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    documentNumber?: string;
    birthDate?: string;
    excludeId?: number;
  }) => api.get<DuplicateResult>('/people/duplicates', q),
  create: (
    body: PersonInput & { statusId?: number; tagIds?: number[]; consent?: boolean; allowDuplicate?: boolean },
  ) => api.post<PersonDetail>('/people', body),
  update: (id: number, body: Partial<PersonInput> & { consent?: boolean }) =>
    api.patch<PersonDetail>(`/people/${id}`, body),
  remove: (id: number) => api.delete(`/people/${id}`),
  changeStatus: (id: number, body: { statusId: number; note?: string | null }) =>
    api.post<PersonDetail>(`/people/${id}/status`, body),
  addMilestone: (id: number, body: { milestoneTypeId: number; date: string; notes?: string | null }) =>
    api.post<PersonDetail>(`/people/${id}/milestones`, body),
  removeMilestone: (id: number, milestoneId: number) =>
    api.delete<PersonDetail>(`/people/${id}/milestones/${milestoneId}`),
  addPosition: (id: number, body: { positionId: number; since?: string | null; until?: string | null }) =>
    api.post<PersonDetail>(`/people/${id}/positions`, body),
  updatePosition: (id: number, positionId: number, body: { since?: string | null; until?: string | null }) =>
    api.patch<PersonDetail>(`/people/${id}/positions/${positionId}`, body),
  removePosition: (id: number, positionId: number) =>
    api.delete<PersonDetail>(`/people/${id}/positions/${positionId}`),
  setTags: (id: number, tagIds: number[]) => api.put<PersonDetail>(`/people/${id}/tags`, { tagIds }),
  merge: (id: number, intoId: number) => api.post<PersonDetail>(`/people/${id}/merge`, { intoId }),
  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ photoFileId: number }>(`/people/${id}/photo`, form);
  },
  removePhoto: (id: number) => api.delete(`/people/${id}/photo`),
};

// ── Hogares ────────────────────────────────────────────────────────────────
export interface HouseholdListItem {
  id: number;
  name: string;
  city: string | null;
  memberCount: number;
}

export interface Household {
  id: number;
  name: string;
  city: string | null;
  province: string | null;
  createdAt: string;
  updatedAt: string;
  address?: string | null;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  members: HouseholdMember[];
  access: { sensitive: boolean };
}

export interface HouseholdInput {
  name: string;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  postalCode?: string | null;
}

export const householdsApi = {
  list: (q: { q?: string; page?: number; pageSize?: number }) =>
    api.get<Paged<HouseholdListItem>>('/households', q),
  get: (id: number) => api.get<Household>(`/households/${id}`),
  create: (body: HouseholdInput & { members: { personId: number; role: HouseholdRole | null }[] }) =>
    api.post<Household>('/households', body),
  update: (id: number, body: Partial<HouseholdInput>) => api.patch<Household>(`/households/${id}`, body),
  remove: (id: number) => api.delete(`/households/${id}`),
  addMember: (id: number, body: { personId: number; role: HouseholdRole | null }) =>
    api.post<Household>(`/households/${id}/members`, body),
  removeMember: (id: number, personId: number) => api.delete(`/households/${id}/members/${personId}`),
};
