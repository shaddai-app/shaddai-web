import { create } from 'zustand';

export interface SupportSession {
  accessToken: string;
  expiresAt: string;
  userEmail: string;
}

interface SessionState {
  /** Access token propio (15 min). Solo en memoria: nunca en localStorage (XSS). */
  accessToken: string | null;
  /** Sesión de soporte del superadmin ("entrar como"); mientras exista, las requests la usan. */
  support: SupportSession | null;
  setAccessToken: (token: string | null) => void;
  startSupport: (support: SupportSession) => void;
  endSupport: () => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  accessToken: null,
  support: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  startSupport: (support) => set({ support }),
  endSupport: () => set({ support: null }),
  clear: () => set({ accessToken: null, support: null }),
}));

export const sessionStore = useSession;
