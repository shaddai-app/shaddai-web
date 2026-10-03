import { api, apiRequest } from './http';
import type { Locale, Scope } from './types';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Usuarios ────────────────────────────────────────────────────────────────
export interface RoleRef {
  id: number;
  name: string;
  systemKey: string | null;
  isLocked: boolean;
}

export interface AccountUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  locale: Locale | null;
  isActive: boolean;
  isAccountOwner: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  locked: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleRef[];
  /** Ficha de persona vinculada (Fase 2). */
  person: { id: number; firstName: string; lastName: string } | null;
}

export interface UserUsage {
  activeUsers: number;
  userLimit: number;
}

export interface UsersQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: 'active' | 'inactive';
  roleId?: number;
}

export interface UserInput {
  email: string;
  firstName: string;
  lastName: string;
  locale: Locale | null;
  roleIds: number[];
  sendAccessEmail: boolean;
  /** Solo en edición: ficha vinculada (null = desvincular, undefined = sin cambios). */
  personId?: number | null;
}

export interface TemporaryAccess {
  user: AccountUser;
  temporaryPassword: string;
}

export const usersApi = {
  list: (q: UsersQuery) => api.get<Paged<AccountUser> & { usage: UserUsage }>('/users', { ...q }),
  create: (body: UserInput) => api.post<TemporaryAccess>('/users', body),
  update: (
    id: number,
    body: Partial<Omit<UserInput, 'email' | 'sendAccessEmail'> & { personId: number | null }>,
  ) => api.patch<AccountUser>(`/users/${id}`, body),
  activate: (id: number) => api.post<AccountUser>(`/users/${id}/activate`),
  deactivate: (id: number) => api.post<AccountUser>(`/users/${id}/deactivate`),
  unlock: (id: number) => api.post<AccountUser>(`/users/${id}/unlock`),
  resetPassword: (id: number, sendAccessEmail: boolean) =>
    api.post<TemporaryAccess>(`/users/${id}/reset-password`, { sendAccessEmail }),
  resetTwoFactor: (id: number) => api.post<AccountUser>(`/users/${id}/reset-2fa`),
};

// ── Roles y permisos ───────────────────────────────────────────────────────
export type Grants = Record<string, Scope>;

export interface Role extends RoleRef {
  description: string | null;
  userCount: number;
  grants: Grants;
}

export interface PermissionModule {
  module: string;
  permissions: { key: string; action: string; supportsScope: boolean }[];
}

export const rolesApi = {
  list: () => api.get<{ items: Role[] }>('/roles'),
  create: (body: { name: string; description: string | null; grants: Grants }) =>
    api.post<Role>('/roles', body),
  update: (id: number, body: Partial<{ name: string; description: string | null; grants: Grants }>) =>
    api.patch<Role>(`/roles/${id}`, body),
  remove: (id: number) => api.delete(`/roles/${id}`),
  matrix: () => api.get<{ modules: PermissionModule[]; roles: Role[] }>('/roles/matrix'),
  saveMatrix: (grants: Record<number, Grants>) =>
    api.put<{ modules: PermissionModule[]; roles: Role[] }>('/roles/matrix', { grants }),
};

// ── Cuenta ────────────────────────────────────────────────────────────────
export interface AccountSettings {
  id: number;
  name: string;
  slug: string;
  status: string;
  logoFileId: number | null;
  defaultLocale: Locale;
  timezone: string;
  currency: string;
  weekStartsOn: number;
  primaryColor: string;
  structureLabels: { network?: string; zone?: string } | null;
  cellMultiplyTarget: number;
  cellReportEditDays: number;
  trialEndsAt: string | null;
  // Solo con cuenta.configurar:
  legalName?: string | null;
  taxId?: string | null;
  taxCondition?: string | null;
  ccliLicense?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface AccountUsage {
  status: string;
  trialEndsAt: string | null;
  userLimit: number;
  activeUsers: number;
  storageLimitMb: number;
  storageUsedMb: number;
  plan: { code: string; name: string };
}

export const accountApi = {
  get: () => api.get<AccountSettings>('/account'),
  update: (body: Partial<Omit<AccountSettings, 'id' | 'slug' | 'status' | 'logoFileId' | 'trialEndsAt'>>) =>
    api.patch<AccountSettings>('/account', body),
  usage: () => api.get<AccountUsage>('/account/usage'),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ logoFileId: number }>('/account/logo', form);
  },
  removeLogo: () => api.delete('/account/logo'),
  file: (id: number) => apiRequest<Blob>(`/files/${id}`, { blob: true }),
  /** ZIP con todos los datos y archivos de la iglesia. */
  exportData: () => apiRequest<Blob>('/account/export', { blob: true }),
  /** Baja de la cuenta (solo el dueño). Corta todas las sesiones. */
  close: (body: { password: string; confirm: string }) =>
    api.post<{ status: 'closed'; purgeAfter: string }>('/account/closure', body),
};

// ── Auditoría ───────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  user: { id: number; firstName: string; lastName: string; email: string } | null;
  support: boolean;
  ip: string | null;
  createdAt: string;
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  userId?: number;
  from?: string;
  to?: string;
}

export const auditApi = {
  list: (q: AuditQuery) => api.get<Paged<AuditEntry>>('/audit', { ...q }),
};
