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

// ── Listas de canciones ───────────────────────────────────────────────────
export type SetlistStatus = 'draft' | 'published';

export interface SetlistListItem {
  id: number;
  eventId: number | null;
  title: string | null;
  eventTitle: string | null;
  startsAt: string;
  cancelled: boolean;
  status: SetlistStatus;
  songs: string[];
}

export interface SetlistItem {
  id: number;
  position: number;
  key: string | null;
  notes: string | null;
  song: {
    id: number;
    title: string;
    author: string | null;
    originalKey: string | null;
    bpm: number | null;
    timeSignature: string | null;
    deleted: boolean;
  };
}

export interface Setlist {
  id: number;
  eventId: number | null;
  event: { id: number; title: string; type: string; location: string | null; allDay: boolean } | null;
  occurrence: string;
  startsAt: string;
  endsAt: string | null;
  cancelled: boolean;
  title: string | null;
  notes: string | null;
  status: SetlistStatus;
  updatedAt: string;
  items: SetlistItem[];
  musicians: {
    status: 'pending' | 'accepted' | 'declined';
    role: string;
    ministry: { id: number; name: string };
    person: { id: number; firstName: string; lastName: string };
  }[];
  canEdit: boolean;
}

export interface SetlistItemInput {
  songId: number;
  key: string | null;
  notes: string | null;
}

export const setlistsApi = {
  list: (from: string, to: string) =>
    api.get<{ items: SetlistListItem[]; canEdit: boolean }>('/setlists', { from, to }),
  get: (id: number) => api.get<Setlist>(`/setlists/${id}`),
  create: (body: {
    eventId: number | null;
    occurrence: string;
    title?: string | null;
    notes?: string | null;
  }) => api.post<Setlist>('/setlists', body),
  update: (id: number, body: { title?: string | null; notes?: string | null; status?: SetlistStatus }) =>
    api.patch<Setlist>(`/setlists/${id}`, body),
  setItems: (id: number, items: SetlistItemInput[]) => api.put<Setlist>(`/setlists/${id}/items`, { items }),
  remove: (id: number) => api.delete(`/setlists/${id}`),
  usage: (songId: number) =>
    api.get<{
      total: number;
      items: {
        setlistId: number;
        date: string;
        title: string | null;
        status: SetlistStatus;
        key: string | null;
      }[];
    }>(`/songs/${songId}/usage`),
};
