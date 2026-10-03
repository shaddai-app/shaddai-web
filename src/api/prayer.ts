import type { Paged } from './admin';
import { api } from './http';

export const PRAYER_VISIBILITIES = ['public', 'leader', 'pastors'] as const;
export type PrayerVisibility = (typeof PRAYER_VISIBILITIES)[number];
export const PRAYER_TABS = ['open', 'answered', 'mine'] as const;
export type PrayerTab = (typeof PRAYER_TABS)[number];

export interface PrayerRequest {
  id: number;
  body: string;
  visibility: PrayerVisibility;
  anonymous: boolean;
  status: 'open' | 'answered';
  answeredAt: string | null;
  testimony: string | null;
  createdAt: string;
  /** null = anónima (para quien no es el autor ni pastor). */
  author: { id: number; name: string } | null;
  mine: boolean;
  prayerCount: number;
  praying: boolean;
}

export interface PrayerInput {
  body: string;
  visibility: PrayerVisibility;
  anonymous: boolean;
}

export interface PrayerUpdate extends Partial<PrayerInput> {
  status?: 'open' | 'answered';
  testimony?: string | null;
}

export interface PrayerContext {
  /** A quién le llega "para mi líder" (vacío: no tiene célula con líder). */
  leaders: string[];
  /** Ve todas y modera el muro. */
  pastoral: boolean;
}

export type PrayingState = Pick<PrayerRequest, 'prayerCount' | 'praying'>;

export const prayerApi = {
  list: (tab: PrayerTab, page = 1) =>
    api.get<Paged<PrayerRequest>>('/prayer-requests', { tab, page, pageSize: 20 }),
  get: (id: number) => api.get<PrayerRequest>(`/prayer-requests/${id}`),
  context: () => api.get<PrayerContext>('/prayer-requests/context'),
  create: (body: PrayerInput) => api.post<PrayerRequest>('/prayer-requests', body),
  update: (id: number, body: PrayerUpdate) => api.patch<PrayerRequest>(`/prayer-requests/${id}`, body),
  remove: (id: number) => api.delete<void>(`/prayer-requests/${id}`),
  pray: (id: number) => api.put<PrayingState>(`/prayer-requests/${id}/praying`),
  unpray: (id: number) => api.delete<PrayingState>(`/prayer-requests/${id}/praying`),
};
