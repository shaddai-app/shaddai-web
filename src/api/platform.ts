import type { Paged } from './admin';
import { api } from './http';
import type { Locale } from './types';

export type AccountStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'closed';
export const ACCOUNT_STATUSES: AccountStatus[] = ['trial', 'active', 'past_due', 'suspended', 'closed'];

export interface Plan {
  id: number;
  code: string;
  name: string;
  userLimit: number;
  storageLimitMb: number;
  priceUsd: string;
  /** Precio mensual en pesos del débito automático (null: sin precio, no se puede suscribir). */
  priceArs: string | null;
  isActive: boolean;
}

export interface AccountListItem {
  id: number;
  name: string;
  slug: string;
  status: AccountStatus;
  userLimit: number;
  activeUsers: number;
  trialEndsAt: string | null;
  createdAt: string;
  plan: { id: number; code: string; name: string };
}

export interface AccountAdmin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isAccountOwner: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
}

export interface PlatformAccount {
  id: number;
  name: string;
  slug: string;
  status: AccountStatus;
  planId: number;
  plan: Plan;
  userLimit: number;
  storageLimitMb: number;
  trialEndsAt: string | null;
  defaultLocale: Locale;
  timezone: string;
  currency: string;
  legalName: string | null;
  taxId: string | null;
  taxCondition: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  closedAt: string | null;
  purgeAfter: string | null;
  createdAt: string;
  usage: { activeUsers: number; userLimit: number; storageUsedMb: number };
  admins: AccountAdmin[];
}

export interface CreateAccountInput {
  name: string;
  slug?: string;
  planId: number;
  userLimit?: number;
  storageLimitMb?: number;
  defaultLocale: Locale;
  timezone: string;
  currency: string;
  status: 'trial' | 'active';
  trialDays: number;
  admin: { email: string; firstName: string; lastName: string };
  sendAccessEmail: boolean;
}

export type UpdateAccountInput = Partial<{
  name: string;
  planId: number;
  userLimit: number;
  storageLimitMb: number;
  trialEndsAt: string | null;
  defaultLocale: Locale;
  timezone: string;
  currency: string;
  legalName: string | null;
  taxId: string | null;
  taxCondition: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}>;

export interface PlatformAuditEntry {
  id: string;
  accountId: number | null;
  userId: number | null;
  impersonatorId: number | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
}

export interface PlatformStats {
  accountsByStatus: Partial<Record<AccountStatus, number>>;
  activeUsers: number;
  newAccountsLast30Days: number;
}

export interface Impersonation {
  accessToken: string;
  expiresAt: string;
  user: { id: number; email: string; accountId: number };
}

export const platformApi = {
  stats: () => api.get<PlatformStats>('/platform/stats'),
  accounts: (q: { page?: number; pageSize?: number; q?: string; status?: AccountStatus }) =>
    api.get<Paged<AccountListItem>>('/platform/accounts', { ...q }),
  account: (id: number) => api.get<PlatformAccount>(`/platform/accounts/${id}`),
  createAccount: (body: CreateAccountInput) =>
    api.post<{ account: PlatformAccount; admin: { id: number; email: string }; temporaryPassword: string }>(
      '/platform/accounts',
      body,
    ),
  updateAccount: (id: number, body: UpdateAccountInput) =>
    api.patch<PlatformAccount>(`/platform/accounts/${id}`, body),
  changeStatus: (id: number, status: AccountStatus, reason: string) =>
    api.post<PlatformAccount>(`/platform/accounts/${id}/status`, { status, reason }),
  resetAdmin: (accountId: number, userId: number, sendAccessEmail: boolean) =>
    api.post<{ user: { id: number; email: string }; temporaryPassword: string }>(
      `/platform/accounts/${accountId}/admins/${userId}/reset-password`,
      { sendAccessEmail },
    ),
  plans: () => api.get<{ items: Plan[] }>('/platform/plans'),
  createPlan: (
    body: Omit<Plan, 'id' | 'priceUsd' | 'priceArs'> & { priceUsd: number; priceArs: number | null },
  ) => api.post<Plan>('/platform/plans', body),
  updatePlan: (
    id: number,
    body: Partial<Omit<Plan, 'id' | 'priceUsd' | 'priceArs'> & { priceUsd: number; priceArs: number | null }>,
  ) => api.patch<Plan>(`/platform/plans/${id}`, body),
  audit: (q: {
    page?: number;
    pageSize?: number;
    accountId?: number;
    action?: string;
    from?: string;
    to?: string;
  }) => api.get<Paged<PlatformAuditEntry>>('/platform/audit', { ...q }),
  impersonate: (userId: number, reason: string) =>
    api.post<Impersonation>('/platform/impersonate', { userId, reason }),
};
