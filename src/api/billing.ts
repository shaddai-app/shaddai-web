import { api } from './http';

export type BillingProviderName = 'none' | 'fake' | 'mercadopago';
export type SubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled';
export type InvoiceStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

export interface Invoice {
  id: number;
  provider: 'mercadopago' | 'fake' | 'manual';
  status: InvoiceStatus;
  amount: number;
  currency: string;
  /** Instantes ISO. */
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface BillingOverview {
  provider: BillingProviderName;
  graceDays: number;
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'closed';
  trialEndsAt: string | null;
  paidUntil: string | null;
  plan: { code: string; name: string; priceArs: number | null };
  subscription: {
    id: number;
    provider: 'mercadopago' | 'fake';
    status: SubscriptionStatus;
    amount: number;
    currency: string;
    /** Solo mientras está pendiente: para retomar el checkout. */
    checkoutUrl: string | null;
    nextPaymentAt: string | null;
    createdAt: string;
    cancelledAt: string | null;
  } | null;
  invoices: Invoice[];
}

export const billingApi = {
  overview: () => api.get<BillingOverview>('/account/billing'),
  subscribe: () => api.post<{ checkoutUrl: string | null }>('/account/billing/subscribe'),
  cancel: () => api.post<BillingOverview>('/account/billing/cancel'),
  /** Solo con el proveedor de prueba (desarrollo). */
  simulatePayment: (status: 'approved' | 'rejected' = 'approved') =>
    api.post<BillingOverview>('/account/billing/simulate-payment', { status }),
  platformOverview: (accountId: number) =>
    api.get<BillingOverview>(`/platform/accounts/${accountId}/billing`),
  manualPayment: (
    accountId: number,
    body: { amount: number; currency?: string; months: number; paidAt?: string; note?: string },
  ) => api.post<BillingOverview>(`/platform/accounts/${accountId}/payments`, body),
};
