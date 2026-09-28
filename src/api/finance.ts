import type { Paged } from './admin';
import { api } from './http';

// ── Cajas ─────────────────────────────────────────────────────────────────
export const ACCOUNT_TYPES = ['cash', 'bank', 'wallet'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface FinanceAccount {
  id: number;
  name: string;
  type: AccountType;
  /** Cada caja tiene su moneda; los saldos no se convierten. */
  currency: string;
  openingBalance: number;
  openingDate: string;
  isActive: boolean;
  balance: number;
  campus: { id: number; name: string } | null;
  responsible: { id: number; firstName: string; lastName: string } | null;
}

export interface FinanceAccountInput {
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
  openingDate: string;
  campusId: number | null;
  responsibleUserId: number | null;
  isActive: boolean;
}

// ── Categorías ────────────────────────────────────────────────────────────
export const CATEGORY_KINDS = ['income', 'expense'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export interface FinanceCategory {
  id: number;
  kind: CategoryKind;
  systemKey: string | null;
  name: string | null;
  sortOrder: number;
  isActive: boolean;
}

// ── Movimientos ───────────────────────────────────────────────────────────
export const PAYMENT_METHODS = ['cash', 'transfer', 'card', 'wallet', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type MovementKind = 'income' | 'expense' | 'transfer_in' | 'transfer_out';

export interface Movement {
  id: number;
  kind: MovementKind;
  date: string;
  amount: number;
  description: string | null;
  isAnonymous: boolean;
  paymentMethod: PaymentMethod | null;
  reference: string | null;
  status: 'confirmed' | 'voided';
  transferPairId: number | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  financeAccount: { id: number; name: string; currency: string };
  category: Pick<FinanceCategory, 'id' | 'kind' | 'systemKey' | 'name'> | null;
  /** Solo viene con finanzas.diezmos_nominales. */
  person?: { id: number; firstName: string; lastName: string } | null;
}

export interface MovementDetail extends Movement {
  createdBy: { id: number; firstName: string; lastName: string } | null;
  attachments: { id: number; originalName: string; mimeType: string; sizeBytes: number }[];
}

export interface MovementInput {
  kind: CategoryKind;
  financeAccountId: number;
  categoryId: number;
  date: string;
  amount: number;
  description?: string | null;
  personId?: number | null;
  isAnonymous?: boolean;
  paymentMethod?: PaymentMethod | null;
  reference?: string | null;
}

export interface CurrencyTotals {
  currency: string;
  income: number;
  expense: number;
  net: number;
}

export interface MovementsQuery {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  financeAccountId?: number;
  categoryId?: number;
  kind?: MovementKind | 'transfer';
  status?: 'confirmed' | 'voided';
  personId?: number;
  q?: string;
}

export interface FinanceSummary {
  today: string;
  month: { from: string; to: string; totals: CurrencyTotals[] };
  accounts: FinanceAccount[];
  recent: Movement[];
}

export const financeApi = {
  summary: () => api.get<FinanceSummary>('/finance/summary'),
  accounts: (includeInactive = false) =>
    api.get<{ items: FinanceAccount[] }>('/finance/accounts', { includeInactive }),
  createAccount: (body: Partial<FinanceAccountInput> & { name: string; type: AccountType }) =>
    api.post<FinanceAccount>('/finance/accounts', body),
  updateAccount: (id: number, body: Partial<FinanceAccountInput>) =>
    api.patch<FinanceAccount>(`/finance/accounts/${id}`, body),
  deleteAccount: (id: number) => api.delete(`/finance/accounts/${id}`),

  categories: (q: { kind?: CategoryKind; includeInactive?: boolean } = {}) =>
    api.get<{ items: FinanceCategory[] }>('/finance/categories', { ...q }),
  createCategory: (body: { kind: CategoryKind; name: string }) =>
    api.post<FinanceCategory>('/finance/categories', body),
  updateCategory: (id: number, body: Partial<{ name: string | null; isActive: boolean }>) =>
    api.patch<FinanceCategory>(`/finance/categories/${id}`, body),
  reorderCategories: (ids: number[]) =>
    api.put<{ items: FinanceCategory[] }>('/finance/categories/order', { ids }),
  deleteCategory: (id: number) => api.delete(`/finance/categories/${id}`),

  movements: (q: MovementsQuery) =>
    api.get<Paged<Movement> & { totals: CurrencyTotals[] }>('/finance/movements', { ...q }),
  movement: (id: number) => api.get<MovementDetail>(`/finance/movements/${id}`),
  createMovement: (body: MovementInput) => api.post<MovementDetail>('/finance/movements', body),
  updateMovement: (id: number, body: Partial<Omit<MovementInput, 'kind'>>) =>
    api.patch<MovementDetail>(`/finance/movements/${id}`, body),
  voidMovement: (id: number, reason: string) =>
    api.post<MovementDetail>(`/finance/movements/${id}/void`, { reason }),
  transfer: (body: {
    fromAccountId: number;
    toAccountId: number;
    date: string;
    amount: number;
    description?: string | null;
    reference?: string | null;
  }) => api.post<{ out: MovementDetail; in: MovementDetail }>('/finance/transfers', body),
  attach: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<MovementDetail>(`/finance/movements/${id}/attachments`, form);
  },
  detach: (id: number, fileId: number) => api.delete(`/finance/movements/${id}/attachments/${fileId}`),
};
