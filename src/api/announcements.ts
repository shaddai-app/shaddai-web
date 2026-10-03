import type { Paged } from './admin';
import { api } from './http';

export const AUDIENCE_KINDS = ['role', 'ministry', 'campus'] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];
export type Audience = { kind: AudienceKind; refId: number };
export const MANAGE_STATUSES = ['current', 'scheduled', 'expired'] as const;
export type ManageStatus = (typeof MANAGE_STATUSES)[number];

export interface Announcement {
  id: number;
  title: string;
  body: string;
  /** Instantes ISO (UTC). */
  publishAt: string;
  expiresAt: string | null;
  pinned: boolean;
  createdAt: string;
  author: { id: number; name: string };
  /** Solo para quien gestiona. */
  audiences?: Audience[];
  notify?: boolean;
  notifiedAt?: string | null;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  publishAt?: string;
  expiresAt?: string | null;
  pinned: boolean;
  notify: boolean;
  audiences: Audience[];
}

type Option = { id: number; name: string };
export interface AudienceOptions {
  roles: Option[];
  ministries: Option[];
  campuses: Option[];
}

export const announcementsApi = {
  feed: (page = 1, pageSize = 10) => api.get<Paged<Announcement>>('/announcements', { page, pageSize }),
  get: (id: number) => api.get<Announcement>(`/announcements/${id}`),
  manage: (status: ManageStatus, page = 1) =>
    api.get<Paged<Announcement>>('/announcements/manage', { status, page, pageSize: 20 }),
  audienceOptions: () => api.get<AudienceOptions>('/announcements/audience-options'),
  create: (body: AnnouncementInput) => api.post<Announcement>('/announcements', body),
  update: (id: number, body: Partial<AnnouncementInput>) =>
    api.patch<Announcement>(`/announcements/${id}`, body),
  remove: (id: number) => api.delete<void>(`/announcements/${id}`),
};
