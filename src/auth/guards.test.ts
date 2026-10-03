import { describe, expect, it } from 'vitest';
import type { Me } from '../api/types';
import { navFor } from '../layout/nav';
import { homePath, pendingStepPath, safeRedirect } from './guards';
import { can } from './permissions';

function me(overrides: Omit<Partial<Me>, 'user'> & { user?: Partial<Me['user']> } = {}): Me {
  return {
    account: null,
    permissions: {},
    restriction: null,
    impersonation: null,
    ...overrides,
    user: {
      id: 1,
      email: 'a@b.c',
      firstName: 'Ana',
      lastName: 'B',
      locale: null,
      theme: 'auto',
      isPlatformAdmin: false,
      isAccountOwner: false,
      totpEnabled: false,
      totpRecoveryCodesLeft: 0,
      isDemoUser: false,
      ...overrides.user,
    },
  };
}

describe('guards', () => {
  it('manda al paso pendiente obligatorio', () => {
    expect(pendingStepPath(me({ restriction: 'password_change' }))).toBe('/cambiar-contrasena');
    expect(pendingStepPath(me({ restriction: 'totp_enroll' }))).toBe('/configurar-2fa');
    expect(pendingStepPath(me())).toBeNull();
    // En soporte no se completan pasos del usuario impersonado.
    expect(
      pendingStepPath(me({ restriction: 'password_change', impersonation: { impersonatorId: 1 } })),
    ).toBeNull();
  });

  it('el superadmin va a la plataforma salvo que esté impersonando', () => {
    expect(homePath(me({ user: { isPlatformAdmin: true } }))).toBe('/plataforma');
    expect(homePath(me({ user: { isPlatformAdmin: true }, impersonation: { impersonatorId: 1 } }))).toBe('/');
    expect(homePath(me())).toBe('/');
  });

  it('solo acepta redirecciones internas', () => {
    expect(safeRedirect('/configuracion/perfil')).toBe('/configuracion/perfil');
    expect(safeRedirect('//evil.example')).toBeUndefined();
    expect(safeRedirect('https://evil.example')).toBeUndefined();
    expect(safeRedirect(undefined)).toBeUndefined();
  });
});

describe('permisos y menú', () => {
  it('can() es OR entre permisos', () => {
    const m = me({ permissions: { 'usuarios.ver': 'all' } });
    expect(can(m, 'usuarios.ver')).toBe(true);
    expect(can(m, 'roles.ver', 'usuarios.ver')).toBe(true);
    expect(can(m, 'roles.ver')).toBe(false);
    expect(can(null, 'usuarios.ver')).toBe(false);
  });

  it('el menú depende del tipo de sesión', () => {
    const church = navFor(me()).flatMap((s) => s.items.map((i) => i.to));
    expect(church).toContain('/');
    expect(church).not.toContain('/plataforma');
    const platform = navFor(me({ user: { isPlatformAdmin: true } })).flatMap((s) => s.items.map((i) => i.to));
    expect(platform).toContain('/plataforma');
    expect(platform).not.toContain('/');
  });

  it('células y estructura aparecen solo con su permiso', () => {
    const paths = (m: Me) => navFor(m).flatMap((s) => s.items.map((i) => i.to));
    expect(paths(me())).not.toContain('/celulas');
    expect(paths(me())).not.toContain('/estructura/redes');
    const leader = paths(me({ permissions: { 'celulas.ver': 'own' } }));
    expect(leader).toContain('/celulas');
    expect(leader).not.toContain('/estructura/redes');
    expect(paths(me({ permissions: { 'estructura.gestionar': 'all' } }))).toContain('/estructura/redes');
  });
});
