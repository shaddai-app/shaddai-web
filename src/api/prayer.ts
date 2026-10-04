import type { Paged } from './admin';
import { api } from './http';

export const PRAYER_VISIBILITIES = ['public', 'leader', 'pastors'] as const;
export type PrayerVisibility = (typeof PRAYER_VISIBILITIES)[number];
/** "received" (las del formulario público) solo la ven los pastores. */
export const PRAYER_TABS = ['open', 'answered', 'mine', 'received'] as const;
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
  /** app = la escribió un usuario; form = la dejó alguien sin usuario desde el formulario público. */
  source: 'app' | 'form';
  /** null = anónima (para quien no es el autor ni pastor) o del formulario sin nombre. id null = del formulario. */
  author: { id: number | null; name: string } | null;
  mine: boolean;
  prayerCount: number;
  praying: boolean;
  /** El autor y el equipo que la atiende leen y escriben respuestas. */
  canReply: boolean;
  replyCount: number;
  /** Datos de quien la pidió por el formulario: solo para el equipo. */
  requester: PrayerRequester | null;
}

export interface PrayerRequester {
  name: string | null;
  phone: string | null;
  email: string | null;
  wantsContact: boolean;
  /** Lo que permitió para el muro: null = no compartirla. */
  wallShare: 'anonymous' | 'named' | null;
  contactedAt: string | null;
  contactedBy: string | null;
}

export interface PrayerReply {
  id: number;
  body: string;
  createdAt: string;
  /** La escribió quien pidió (desde su enlace o su usuario). */
  fromRequester: boolean;
  mine: boolean;
  author: string | null;
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
  replies: (id: number) => api.get<PrayerReply[]>(`/prayer-requests/${id}/replies`),
  reply: (id: number, body: string) => api.post<PrayerReply>(`/prayer-requests/${id}/replies`, { body }),
  contacted: (id: number) => api.put<PrayerRequest>(`/prayer-requests/${id}/contacted`),
  uncontacted: (id: number) => api.delete<PrayerRequest>(`/prayer-requests/${id}/contacted`),
};

// ── Formulario público y enlace privado (sin sesión) ───────────────────────

export interface PublicPrayerConfig {
  church: { name: string; slug: string; logoUrl: string | null; defaultLocale: string; primaryColor: string };
  consentVersion: string;
  turnstileSiteKey: string | null;
}

export const WALL_SHARES = ['no', 'anonymous', 'named'] as const;
export type WallShare = (typeof WALL_SHARES)[number];

export interface PublicPrayerInput {
  body: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  wantsContact: boolean;
  wallShare: WallShare;
  consent: true;
  locale: string;
  turnstileToken?: string;
  website?: string;
}

/** Lo que ve quien pidió desde su enlace. */
export interface PublicPrayerView {
  body: string;
  status: 'open' | 'answered';
  answeredAt: string | null;
  testimony: string | null;
  createdAt: string;
  name: string | null;
  wantsContact: boolean;
  contacted: boolean;
  onWall: boolean;
  prayerCount: number;
  replies: PrayerReply[];
}

const link = (slug: string, token: string) => `/public/${slug}/prayer/${token}`;
const noAuth = { auth: false } as const;

export const publicPrayerApi = {
  form: (slug: string) => api.get<PublicPrayerConfig>(`/public/${slug}/prayer-form`, undefined, noAuth),
  submit: (slug: string, body: PublicPrayerInput) =>
    api.post<{ token: string }>(`/public/${slug}/prayer`, body, noAuth),
  view: (slug: string, token: string) =>
    api.get<{ church: PublicPrayerConfig['church']; request: PublicPrayerView }>(
      link(slug, token),
      undefined,
      noAuth,
    ),
  reply: (slug: string, token: string, body: string) =>
    api.post<PublicPrayerView>(`${link(slug, token)}/replies`, { body }, noAuth),
  update: (slug: string, token: string, body: { status: 'open' | 'answered'; testimony?: string | null }) =>
    api.patch<PublicPrayerView>(link(slug, token), body, noAuth),
  withdraw: (slug: string, token: string) => api.delete<void>(link(slug, token), noAuth),
};
