import { IconBuildingChurch, IconHome, IconShieldLock, IconUserCircle, type Icon } from '@tabler/icons-react';
import type { Me } from '../api/types';
import { isPlatformSession } from '../auth/guards';
import { can, type PermissionKey } from '../auth/permissions';

export interface NavItem {
  to: string;
  /** Clave en common:nav.* */
  label: 'home' | 'profile' | 'security' | 'accounts';
  icon: Icon;
  /** Basta uno (OR). Sin permisos = visible para cualquier usuario de la sección. */
  permissions?: PermissionKey[];
  /** Aparece en la barra inferior del celular (máx. 4; el resto va a "Más"). */
  mobile?: boolean;
  /** Coincidencia exacta de la ruta para marcarlo activo. */
  exact?: boolean;
}

export interface NavSection {
  title?: 'admin' | 'settings' | 'platform';
  items: NavItem[];
}

const settingsSection: NavSection = {
  title: 'settings',
  items: [
    { to: '/configuracion/perfil', label: 'profile', icon: IconUserCircle, mobile: true },
    { to: '/configuracion/seguridad', label: 'security', icon: IconShieldLock },
  ],
};

// Cada módulo nuevo agrega acá sus entradas con el permiso que las muestra.
const churchNav: NavSection[] = [
  { items: [{ to: '/', label: 'home', icon: IconHome, mobile: true, exact: true }] },
  settingsSection,
];

const platformNav: NavSection[] = [
  {
    title: 'platform',
    items: [{ to: '/plataforma', label: 'accounts', icon: IconBuildingChurch, mobile: true }],
  },
  settingsSection,
];

/** Menú según el tipo de sesión, filtrado por permisos (nunca se muestra un link sin acceso). */
export function navFor(me: Me): NavSection[] {
  const sections = isPlatformSession(me) ? platformNav : churchNav;
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.permissions || can(me, ...i.permissions)) }))
    .filter((s) => s.items.length > 0);
}
