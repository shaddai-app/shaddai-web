import { api, apiRequest } from './http';

export const ITEM_STATUSES = ['ok', 'faulty', 'repair', 'retired'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export const MAINTENANCE_TYPES = ['preventive', 'repair', 'check'] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

type Ref = { id: number; name: string };
type CategoryRef = { id: number; name: string | null; systemKey: string | null };

export interface InventoryListItem {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  model: string | null;
  status: ItemStatus;
  location: string | null;
  photoFileId: number | null;
  category: CategoryRef;
  campus: Ref | null;
  /** Préstamo abierto (sin la persona: eso requiere inventario.prestamos). */
  loan: OpenLoan | null;
}

export interface OpenLoan {
  dueAt: string;
  overdue: boolean;
}

export interface Maintenance {
  id: number;
  date: string;
  type: MaintenanceType;
  description: string;
  cost: number | null;
  vendor: string | null;
  createdAt: string;
}

export interface InventoryItem extends InventoryListItem {
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseValue: number | null;
  qrUrl: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  maintenance: Maintenance[];
  maintenanceCost: number;
}

export interface ItemInput {
  code?: string;
  name: string;
  categoryId: number;
  campusId: number | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  status: ItemStatus;
  location: string | null;
  purchaseDate: string | null;
  purchaseValue: number | null;
  notes: string | null;
}

export interface MaintenanceInput {
  date: string;
  type: MaintenanceType;
  description: string;
  cost: number | null;
  vendor: string | null;
  status?: ItemStatus;
}

export type InventoryListQuery = {
  q?: string;
  categoryId?: number;
  campusId?: number;
  status?: ItemStatus;
  includeRetired?: boolean;
  onLoan?: boolean;
  page?: number;
  pageSize?: number;
};

export const inventoryApi = {
  list: (q: InventoryListQuery) =>
    api.get<{
      items: InventoryListItem[];
      total: number;
      page: number;
      pageSize: number;
      counts: Record<ItemStatus | 'onLoan', number>;
    }>('/inventory/items', q),
  get: (id: number) => api.get<InventoryItem>(`/inventory/items/${id}`),
  create: (body: ItemInput) => api.post<InventoryItem>('/inventory/items', body),
  update: (id: number, body: Partial<ItemInput>) => api.patch<InventoryItem>(`/inventory/items/${id}`, body),
  remove: (id: number) => api.delete(`/inventory/items/${id}`),
  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ photoFileId: number }>(`/inventory/items/${id}/photo`, form);
  },
  removePhoto: (id: number) => api.delete(`/inventory/items/${id}/photo`),
  addMaintenance: (id: number, body: MaintenanceInput) =>
    api.post<InventoryItem>(`/inventory/items/${id}/maintenance`, body),
  removeMaintenance: (id: number) => api.delete<InventoryItem>(`/inventory/maintenance/${id}`),
  resolveQr: (token: string) => api.get<{ id: number }>(`/inventory/q/${encodeURIComponent(token)}`),
  label: (id: number) => apiRequest<Blob>(`/inventory/items/${id}/label.pdf`, { blob: true }),
  labels: (ids: number[]) =>
    apiRequest<Blob>('/inventory/labels.pdf', { query: { ids: ids.join(',') }, blob: true }),
};

// ── Préstamos ─────────────────────────────────────────────────────────────
export const LOAN_STATES = ['open', 'overdue', 'returned', 'all'] as const;
export type LoanState = (typeof LOAN_STATES)[number];

export interface Borrower {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface Loan {
  id: number;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  conditionOut: string | null;
  conditionIn: string | null;
  notes: string | null;
  createdAt: string;
  overdue: boolean;
  daysOverdue: number;
  item: { id: number; code: string; name: string; status: ItemStatus; deleted: boolean };
  borrower: Borrower & { photoFileId: number | null };
}

export interface LoanInput {
  itemId: number;
  borrowerPersonId: number;
  borrowedAt?: string;
  dueAt: string;
  conditionOut: string | null;
  notes: string | null;
}

export type LoansQuery = {
  state?: LoanState;
  q?: string;
  itemId?: number;
  personId?: number;
  page?: number;
  pageSize?: number;
};

export const loansApi = {
  list: (q: LoansQuery) =>
    api.get<{
      items: Loan[];
      total: number;
      page: number;
      pageSize: number;
      counts: { open: number; overdue: number };
    }>('/inventory/loans', q),
  get: (id: number) => api.get<Loan>(`/inventory/loans/${id}`),
  create: (body: LoanInput) => api.post<Loan>('/inventory/loans', body),
  update: (id: number, body: { dueAt?: string; notes?: string | null }) =>
    api.patch<Loan>(`/inventory/loans/${id}`, body),
  giveBack: (id: number, body: { conditionIn: string | null; status?: Exclude<ItemStatus, 'retired'> }) =>
    api.post<Loan>(`/inventory/loans/${id}/return`, body),
  remove: (id: number) => api.delete(`/inventory/loans/${id}`),
  borrowers: (q: string) => api.get<{ items: Borrower[] }>('/inventory/borrowers', { q }),
};
