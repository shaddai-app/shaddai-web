import {
  IconBox,
  IconBell,
  IconBuildingBank,
  IconCalendar,
  IconCalendarUser,
  IconBuildingChurch,
  IconBuildingCommunity,
  IconCategory,
  IconClipboardText,
  IconCoin,
  IconCoins,
  IconHourglass,
  IconArrowsExchange,
  IconLock,
  IconMusic,
  IconPlaylist,
  IconReportMoney,
  IconSchool,
  IconHeartHandshake,
  IconHierarchy2,
  IconHistory,
  IconDatabaseExport,
  IconHome,
  IconHomeHeart,
  IconPackage,
  IconPray,
  IconSpeakerphone,
  IconSettings,
  IconShieldCheck,
  IconShieldLock,
  IconTags,
  IconTrafficLights,
  IconUserCheck,
  IconUserStar,
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
    | 'consolidation'
    | 'finance'
    | 'offeringCounts'
    | 'financePending'
    | 'financePeriods'
    | 'financeReports'
    | 'calendar'
    | 'attendance'
    | 'ministries'
    | 'myAssignments'
    | 'songs'
    | 'setlists'
    | 'inventory'
    | 'loans'
    | 'financeAccounts'
    | 'financeCategories'
    | 'cells'
    | 'myCell'
    | 'cellReports'
    | 'structure'
    | 'catalogs'
    | 'campuses'
    | 'profile'
    | 'security'
    | 'notifications'
    | 'accounts'
    | 'users'
    | 'roles'
    | 'churchSettings'
    | 'announcements'
    | 'prayer'
    | 'courses'
    | 'dataAndClosure'
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

// En una iglesia, además, las preferencias de avisos (el panel de plataforma no tiene avisos).
const churchSettingsSection: NavSection = {
  ...settingsSection,
  items: [
    ...settingsSection.items,
    { to: '/configuracion/notificaciones', label: 'notifications', icon: IconBell },
  ],
};

// Cada módulo nuevo agrega acá sus entradas con el permiso que las muestra.
const churchNav: NavSection[] = [
  {
    items: [
      { to: '/', label: 'home', icon: IconHome, mobile: true, exact: true },
      { to: '/anuncios', label: 'announcements', icon: IconSpeakerphone },
      { to: '/oracion', label: 'prayer', icon: IconPray },
      { to: '/discipulado', label: 'courses', icon: IconSchool, permissions: ['discipulado.ver'] },
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
        to: '/consolidacion',
        label: 'consolidation',
        icon: IconHeartHandshake,
        permissions: ['consolidacion.ver'],
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
      {
        to: '/calendario',
        label: 'calendar',
        icon: IconCalendar,
        permissions: ['eventos.ver'],
        alsoActive: ['/eventos'],
      },
      {
        to: '/asistencia',
        label: 'attendance',
        icon: IconUserCheck,
        permissions: ['asistencia.ver', 'asistencia.registrar'],
      },
      {
        to: '/ministerios',
        label: 'ministries',
        icon: IconUserStar,
        permissions: ['ministerios.ver'],
      },
      // Sin permisos: cualquiera ve sus turnos (si su usuario está vinculado a una ficha).
      { to: '/mis-turnos', label: 'myAssignments', icon: IconCalendarUser },
      {
        to: '/alabanza/canciones',
        label: 'songs',
        icon: IconMusic,
        permissions: ['alabanza.ver'],
      },
      {
        to: '/alabanza/listas',
        label: 'setlists',
        icon: IconPlaylist,
        permissions: ['alabanza.ver'],
      },
      {
        to: '/inventario',
        label: 'inventory',
        icon: IconBox,
        permissions: ['inventario.ver'],
        excludeActive: ['/inventario/prestamos'],
      },
      {
        to: '/inventario/prestamos',
        label: 'loans',
        icon: IconArrowsExchange,
        permissions: ['inventario.prestamos'],
      },
      {
        to: '/finanzas',
        label: 'finance',
        icon: IconCoin,
        mobile: true,
        permissions: ['finanzas.ver'],
        excludeActive: [
          '/finanzas/cajas',
          '/finanzas/categorias',
          '/finanzas/arqueos',
          '/finanzas/pendientes',
        ],
      },
      {
        to: '/finanzas/arqueos',
        label: 'offeringCounts',
        icon: IconCoins,
        permissions: ['finanzas.arqueo'],
      },
      {
        to: '/finanzas/pendientes',
        label: 'financePending',
        icon: IconHourglass,
        permissions: ['finanzas.confirmar_pendientes'],
      },
      {
        to: '/finanzas/cierres',
        label: 'financePeriods',
        icon: IconLock,
        permissions: ['finanzas.cierre'],
      },
      {
        to: '/finanzas/reportes',
        label: 'financeReports',
        icon: IconReportMoney,
        permissions: ['finanzas.reportes'],
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
        to: '/finanzas/cajas',
        label: 'financeAccounts',
        icon: IconBuildingBank,
        permissions: ['finanzas.cajas'],
      },
      {
        to: '/finanzas/categorias',
        label: 'financeCategories',
        icon: IconTags,
        permissions: ['finanzas.categorias'],
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
      {
        to: '/admin/datos',
        label: 'dataAndClosure',
        icon: IconDatabaseExport,
        permissions: ['cuenta.configurar'],
      },
      { to: '/admin/auditoria', label: 'audit', icon: IconHistory, permissions: ['auditoria.ver'] },
    ],
  },
  churchSettingsSection,
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
