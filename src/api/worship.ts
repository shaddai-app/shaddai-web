import { api } from './http';

export const LINK_TYPES = ['youtube', 'spotify', 'multitrack', 'sheet', 'other'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export interface SongLink {
  id?: number;
  type: LinkType;
  url: string;
  label: string | null;
}

export interface SongListItem {
  id: number;
  title: string;
  author: string | null;
  ccliNumber: string | null;
  originalKey: string | null;
  bpm: number | null;
  timeSignature: string | null;
  tags: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface Song extends SongListItem {
  chordPro: string | null;
  notes: string | null;
  createdAt: string;
  links: (SongLink & { id: number })[];
}

export interface SongInput {
  title: string;
  author: string | null;
  ccliNumber: string | null;
  originalKey: string | null;
  bpm: number | null;
  timeSignature: string | null;
  chordPro: string | null;
  tags: string[];
  notes: string | null;
  isActive?: boolean;
  links: SongLink[];
}

export const songsApi = {
  list: (q: { q?: string; tag?: string; includeInactive?: boolean; page?: number; pageSize?: number }) =>
    api.get<{ items: SongListItem[]; total: number; page: number; pageSize: number; tags: string[] }>(
      '/songs',
      q,
    ),
  get: (id: number) => api.get<Song>(`/songs/${id}`),
  create: (body: SongInput) => api.post<Song>('/songs', body),
  update: (id: number, body: Partial<SongInput>) => api.patch<Song>(`/songs/${id}`, body),
  remove: (id: number) => api.delete(`/songs/${id}`),
};
