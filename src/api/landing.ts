import { api } from './http';
import type { SessionTokenResponse } from './types';

/** Plan tal como lo muestra la landing (GET /public/plans). Sin precio en pesos → "Precio a definir". */
export interface PublicPlan {
  code: string;
  name: string;
  userLimit: number;
  storageLimitMb: number;
  priceArs: number | null;
}

export interface PublicPlans {
  items: PublicPlan[];
  trialDays: number;
}

/** Los 4 perfiles de la iglesia demo. */
export const DEMO_ROLES = ['admin', 'pastor', 'treasurer', 'cell_leader'] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const landingApi = {
  plans: () => api.get<PublicPlans>('/public/plans', undefined, { auth: false }),
  /** Ingreso a la demo con un clic: el servidor elige el usuario demo del perfil. */
  demo: (role: DemoRole) => api.post<SessionTokenResponse>('/auth/demo', { role }, { auth: false }),
};
