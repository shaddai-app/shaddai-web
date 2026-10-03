/** Fecha de la versión vigente de los textos legales. */
export const LEGAL_UPDATED = '2026-10-02';
/** Mientras un abogado no revise los textos, se muestran como borrador. */
export const LEGAL_DRAFT = true;
/** Contacto de soporte que se muestra a las iglesias (privacidad, términos, baja). */
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? 'soporte@shaddai.local';

/** Secciones de cada texto legal, en orden (claves de legal.json). */
export const LEGAL_SECTIONS = {
  privacy: [
    'roles',
    'data',
    'purposes',
    'providers',
    'security',
    'retention',
    'rights',
    'authority',
    'cookies',
    'changes',
  ],
  terms: ['service', 'accounts', 'churchData', 'use', 'plans', 'closure', 'availability', 'liability', 'law'],
} as const;
