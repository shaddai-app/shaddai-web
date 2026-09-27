import {
  IconBuildingChurch,
  IconBuildingCommunity,
  IconCategory,
  IconClipboardText,
  IconHierarchy2,
  IconHistory,
  IconHome,
  IconHomeHeart,
  IconPackage,
  IconSettings,
  IconShieldCheck,
  IconShieldLock,
  IconTrafficLights,
  IconUserCircle,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react';
import type { Me } from '../api/types';
import { isPlatformSession } from '../auth/guards';
import { can, type PermissionKey } from '../auth/permissions';

export interface NavItem {
  to: string;
  /** Clave en common:nav.* */
  label:
    | 'home'
    | 'people'
    | 'newcomers'
    | 'cells'
    | 'myCell'
    | 'cellReports'
    | 'structure'
    | 'catalogs'
    | 'campuses'
    | 'profile'
    | 'security'
    | 'accounts'
    | 'users'
    | 'roles'
    | 'churchSettings'
    | 'audit'
    | 'plans'
    | 'platformAudit';
  /** Rutas que no deben marcar este ítem como activo aunque empiecen igual (ej. /plataforma vs /plataforma/planes). */
  excludeActive?: string[];
  /** Otras rutas que también lo marcan activo (ej. /estructura/zonas para /estructura/redes). */
  alsoActive?: string[];
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
  {
    items: [
      { to: '/', label: 'home', icon: IconHome, mobile: true, exact: true },
      {
        to: '/mi-celula',
        label: 'myCell',
        icon: IconClipboardText,
        mobile: true,
        permissions: ['celulas.reportar'],
      },
      {
        to: '/personas',
        label: 'people',
        icon: IconUsersGroup,
        mobile: true,
        permissions: ['personas.ver'],
        excludeActive: ['/personas/nuevos'],
      },
      {
        to: '/personas/nuevos',
        label: 'newcomers',
        icon: IconUserPlus,
        permissions: ['personas.nuevos_revisar'],
      },
      {
        to: '/celulas',
        label: 'cells',
        icon: IconHomeHeart,
        mobile: true,
        permissions: ['celulas.ver'],
        excludeActive: ['/celulas/reportes'],
      },
      {
        to: '/celulas/reportes',
        label: 'cellReports',
        icon: IconTrafficLights,
        permissions: ['celulas.ver_reportes'],
      },
    ],
  },
  {
    title: 'admin',
    items: [
      { to: '/admin/usuarios', label: 'users', icon: IconUsers, permissions: ['usuarios.ver'] },
      { to: '/admin/roles', label: 'roles', icon: IconShieldCheck, permissions: ['roles.ver'] },
      {
        to: '/admin/catalogos',
        label: 'catalogs',
        icon: IconCategory,
        permissions: ['catalogos.gestionar'],
      },
      {
        to: '/estructura/redes',
        label: 'structure',
        icon: IconHierarchy2,
        permissions: ['estructura.gestionar'],
        alsoActive: ['/estructura'],
      },
      {
        to: '/admin/sedes',
        label: 'campuses',
        icon: IconBuildingCommunity,
        permissions: ['estructura.gestionar'],
      },
      {
        to: '/admin/cuenta',
        label: 'churchSettings',
        icon: IconSettings,
        permissions: ['cuenta.configurar'],
      },
      { to: '/admin/auditoria', label: 'audit', icon: IconHistory, permissions: ['auditoria.ver'] },
    ],
  },
  settingsSection,
];

const platformNav: NavSection[] = [
  {
    title: 'platform',
    items: [
      {
        to: '/plataforma',
        label: 'accounts',
        icon: IconBuildingChurch,
        mobile: true,
        excludeActive: ['/plataforma/planes', '/plataforma/auditoria'],
      },
      { to: '/plataforma/planes', label: 'plans', icon: IconPackage, mobile: true },
      { to: '/plataforma/auditoria', label: 'platformAudit', icon: IconHistory },
    ],
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
