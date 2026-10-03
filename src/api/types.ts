// Tipos de las respuestas de shaddai-api usadas por el front (Fase 1).

export type Scope = 'all' | 'own';
export type PermissionMap = Partial<Record<string, Scope>>;
export type Restriction = 'password_change' | 'totp_enroll' | null;
export type ThemePreference = 'light' | 'dark' | 'auto';
export type Locale = 'es' | 'en' | 'pt';

export interface Me {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    locale: Locale | null;
    theme: ThemePreference;
    isPlatformAdmin: boolean;
    isAccountOwner: boolean;
    totpEnabled: boolean;
    /** Códigos de recuperación sin usar (0 si no tiene la verificación en dos pasos). */
    totpRecoveryCodesLeft: number;
    /** Uno de los 4 usuarios compartidos de la demo: sin cambiar contraseña, 2FA ni sesiones. */
    isDemoUser: boolean;
  };
  account: {
    id: number;
    name: string;
    slug: string;
    status: 'trial' | 'active' | 'past_due' | 'suspended' | 'closed';
    defaultLocale: Locale;
    timezone: string;
    currency: string;
    weekStartsOn: number;
    primaryColor: string;
    trialEndsAt: string | null;
    /** La iglesia demo pública: aviso fijo y acciones bloqueadas. */
    isDemo: boolean;
  } | null;
  permissions: PermissionMap;
  restriction: Restriction;
  impersonation: { impersonatorId: number } | null;
}

export type LoginResponse =
  | { requires2fa: true; challengeToken: string }
  | { requires2fa?: false; accessToken: string; restriction: Restriction };

export interface SessionTokenResponse {
  accessToken: string;
  restriction: Restriction;
}

export interface ActiveSession {
  id: string;
  current: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
  expiresAt: string;
  support: boolean;
}
