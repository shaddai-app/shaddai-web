import type { Paged } from './admin';
import { api, apiRequest } from './http';

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
export type MovementStatus = 'pending' | 'confirmed' | 'voided' | 'rejected';

export interface Movement {
  id: number;
  kind: MovementKind;
  date: string;
  amount: number;
  description: string | null;
  isAnonymous: boolean;
  paymentMethod: PaymentMethod | null;
  reference: string | null;
  status: MovementStatus;
  transferPairId: number | null;
  confirmedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  /** null en las ofrendas de célula pendientes (o rechazadas): tesorería elige la caja al confirmar. */
  financeAccount: { id: number; name: string; currency: string } | null;
  category: Pick<FinanceCategory, 'id' | 'kind' | 'systemKey' | 'name'> | null;
  cellReport: { id: number; meetingDate: string; cell: { id: number; name: string } } | null;
  offeringCount: { id: number; title: string | null } | null;
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
  /** Ofrendas de célula por confirmar y arqueos en borrador. */
  pending: { movements: number; counts: number };
  /** Último día cerrado (null si no hay meses cerrados): antes no se carga ni se modifica nada. */
  closedUntil: string | null;
  accounts: FinanceAccount[];
  recent: Movement[];
}

// ── Pendientes y arqueos ──────────────────────────────────────────────────
export interface PendingList extends Paged<Movement> {
  /** Suma en la moneda de la iglesia (las ofrendas de célula se informan en esa moneda). */
  sum: { currency: string; amount: number };
}

export interface ConfirmPendingInput {
  financeAccountId: number;
  categoryId?: number;
  date?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  description?: string | null;
  reference?: string | null;
}

export type CountStatus = 'draft' | 'confirmed' | 'voided';
type PersonRef = { id: number; firstName: string; lastName: string };

export interface OfferingCount {
  id: number;
  date: string;
  title: string | null;
  status: CountStatus;
  notes: string | null;
  total: number;
  createdAt: string;
  confirmedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  financeAccount: { id: number; name: string; currency: string };
  counter1: PersonRef;
  counter2: PersonRef;
}

export interface CountLine {
  id: number;
  paymentMethod: PaymentMethod;
  denomination: number | null;
  quantity: number | null;
  amount: number;
  category: FinanceCategory;
  /** Sobre con nombre. El nombre solo viene con finanzas.diezmos_nominales. */
  nominal: boolean;
  person?: PersonRef | null;
}

export interface OfferingCountDetail extends OfferingCount {
  createdBy: PersonRef | null;
  confirmedBy: PersonRef | null;
  byPaymentMethod: { paymentMethod: PaymentMethod; amount: number }[];
  lines: CountLine[];
  movements: Movement[];
}

export interface CountLineInput {
  categoryId: number;
  paymentMethod: PaymentMethod;
  denomination?: number | null;
  quantity?: number | null;
  amount?: number | null;
  personId?: number | null;
}

export interface CountInput {
  date: string;
  financeAccountId: number;
  title: string | null;
  counter1PersonId: number;
  counter2PersonId: number;
  notes: string | null;
  lines: CountLineInput[];
}

// ── Cierre mensual ────────────────────────────────────────────────────────
export interface Period {
  year: number;
  month: number;
  from: string;
  to: string;
  status: 'open' | 'closed';
  closedAt: string | null;
  closedBy: PersonRef | null;
  notes: string | null;
  reopenedAt: string | null;
  reopenedBy: PersonRef | null;
  reopenReason: string | null;
  canClose: boolean;
  canReopen: boolean;
}

export interface PeriodBalance {
  financeAccount: { id: number; name: string; currency: string; isActive: boolean };
  opening: number;
  income: number;
  expense: number;
  transfersIn: number;
  transfersOut: number;
  closing: number;
}

export interface PeriodDetail extends Period {
  balances: PeriodBalance[];
  totals: { currency: string; opening: number; income: number; expense: number; closing: number }[];
  unresolved: { pending: number; drafts: number };
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

  pending: (q: { page?: number; pageSize?: number; status?: 'pending' | 'rejected' } = {}) =>
    api.get<PendingList>('/finance/pending', { ...q }),
  confirmPending: (id: number, body: ConfirmPendingInput) =>
    api.post<MovementDetail>(`/finance/pending/${id}/confirm`, body),
  rejectPending: (id: number, reason: string) =>
    api.post<MovementDetail>(`/finance/pending/${id}/reject`, { reason }),

  counts: (q: { page?: number; pageSize?: number; status?: CountStatus; from?: string; to?: string } = {}) =>
    api.get<Paged<OfferingCount>>('/finance/offering-counts', { ...q }),
  count: (id: number) => api.get<OfferingCountDetail>(`/finance/offering-counts/${id}`),
  createCount: (body: CountInput) => api.post<OfferingCountDetail>('/finance/offering-counts', body),
  updateCount: (id: number, body: Partial<CountInput>) =>
    api.patch<OfferingCountDetail>(`/finance/offering-counts/${id}`, body),
  deleteCount: (id: number) => api.delete(`/finance/offering-counts/${id}`),
  confirmCount: (id: number) => api.post<OfferingCountDetail>(`/finance/offering-counts/${id}/confirm`),
  voidCount: (id: number, reason: string) =>
    api.post<OfferingCountDetail>(`/finance/offering-counts/${id}/void`, { reason }),

  periods: () =>
    api.get<{ items: Period[]; lastClosed: { year: number; month: number } | null }>('/finance/periods'),
  period: (year: number, month: number) => api.get<PeriodDetail>(`/finance/periods/${year}/${month}`),
  closePeriod: (year: number, month: number, notes: string | null) =>
    api.post<PeriodDetail>(`/finance/periods/${year}/${month}/close`, { notes }),
  reopenPeriod: (year: number, month: number, reason: string) =>
    api.post<PeriodDetail>(`/finance/periods/${year}/${month}/reopen`, { reason }),
};

// ── Reportes ──────────────────────────────────────────────────────────────
export type ReportType = 'income-statement' | 'balances' | 'tithes-trend' | 'contributions';
export type ReportFormat = 'pdf' | 'xlsx';
type CategoryRef = Pick<FinanceCategory, 'id' | 'kind' | 'systemKey' | 'name'>;

export interface IncomeStatement {
  from: string;
  to: string;
  financeAccount: { id: number; name: string; currency: string } | null;
  currencies: {
    currency: string;
    income: { category: CategoryRef; amount: number }[];
    expense: { category: CategoryRef; amount: number }[];
    totalIncome: number;
    totalExpense: number;
    net: number;
  }[];
}

export interface BalancesReport {
  asOf: string;
  items: {
    id: number;
    name: string;
    type: AccountType;
    currency: string;
    isActive: boolean;
    balance: number;
  }[];
  totals: { currency: string; balance: number }[];
}

export interface TrendMonth {
  month: number;
  tithe: number;
  offering: number;
  otherIncome: number;
  expense: number;
  net: number;
}

export interface TrendReport {
  year: number;
  currencies: { currency: string; months: TrendMonth[]; totals: Omit<TrendMonth, 'month'> }[];
}

export interface ContributionsReport {
  year: number;
  items: {
    person: PersonRef & { documentNumber?: string | null };
    byCurrency: { currency: string; tithe: number; other: number; total: number; count: number }[];
  }[];
  totals: { currency: string; total: number }[];
}

export interface PersonContributions {
  person: PersonRef & { documentNumber?: string | null };
  year: number;
  years: number[];
  movements: {
    id: number;
    date: string;
    amount: number;
    paymentMethod: PaymentMethod | null;
    description: string | null;
    financeAccount: { id: number; name: string; currency: string };
    category: CategoryRef | null;
  }[];
  totals: { currency: string; total: number }[];
}

type ReportQuery = Record<string, string | number | undefined>;

export const reportsApi = {
  incomeStatement: (q: { from?: string; to?: string; financeAccountId?: number }) =>
    api.get<IncomeStatement>('/finance/reports/income-statement', { ...q }),
  balances: (q: { asOf?: string }) => api.get<BalancesReport>('/finance/reports/balances', { ...q }),
  trend: (q: { year?: number }) => api.get<TrendReport>('/finance/reports/tithes-trend', { ...q }),
  contributions: (q: { year?: number }) =>
    api.get<ContributionsReport>('/finance/reports/contributions', { ...q }),
  /** El archivo del reporte (PDF o Excel) en el idioma pedido. */
  download: (type: ReportType, format: ReportFormat, lang: string, q: ReportQuery) =>
    apiRequest<Blob>(`/finance/reports/${type}`, { query: { ...q, format, lang }, blob: true }),
  personContributions: (personId: number, year?: number) =>
    api.get<PersonContributions>(`/people/${personId}/contributions`, { year }),
  certificate: (personId: number, year: number, lang: string) =>
    apiRequest<Blob>(`/people/${personId}/contributions/certificate`, { query: { year, lang }, blob: true }),
  receipt: (movementId: number, lang: string) =>
    apiRequest<Blob>(`/finance/movements/${movementId}/receipt`, { query: { lang }, blob: true }),
};
