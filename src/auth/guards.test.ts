import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Me } from '../api/types';
import { navFor } from '../layout/nav';
import { guardHome, homePath, pendingStep, safeRedirect } from './guards';
import { loadMe } from './session';
import { can } from './permissions';

vi.mock('./session', () => ({ loadMe: vi.fn() }));

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
    expect(pendingStep(me({ restriction: 'password_change' }))).toBe('cambiar-contrasena');
    expect(pendingStep(me({ restriction: 'totp_enroll' }))).toBe('configurar-2fa');
    expect(pendingStep(me())).toBeNull();
    // En soporte no se completan pasos del usuario impersonado.
    expect(
      pendingStep(me({ restriction: 'password_change', impersonation: { impersonatorId: 1 } })),
    ).toBeNull();
  });

  it('el superadmin va a la plataforma salvo que esté impersonando', () => {
    expect(homePath(me({ user: { isPlatformAdmin: true } }))).toBe('/plataforma');
    expect(homePath(me({ user: { isPlatformAdmin: true }, impersonation: { impersonatorId: 1 } }))).toBe(
      '/inicio',
    );
    expect(homePath(me())).toBe('/inicio');
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
    expect(church).toContain('/inicio');
    expect(church).not.toContain('/plataforma');
    const platform = navFor(me({ user: { isPlatformAdmin: true } })).flatMap((s) => s.items.map((i) => i.to));
    expect(platform).toContain('/plataforma');
    expect(platform).not.toContain('/inicio');
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

describe('home (landing con la tarjeta de ingreso)', () => {
  const context = { queryClient: {} as QueryClient };
  /** El destino del redirect que tira el guard, o null si deja ver el home. */
  async function outcome(session: Me | null, search: Parameters<typeof guardHome>[1] = {}) {
    vi.mocked(loadMe).mockResolvedValue(session);
    try {
      await guardHome({ context }, search);
      return null;
    } catch (err) {
      const { options } = err as { options: { to?: string; search?: unknown } };
      return { to: options.to, search: options.search };
    }
  }

  beforeEach(() => vi.mocked(loadMe).mockReset());

  it('sin sesión muestra el home; un paso obligatorio sin sesión vuelve al login', async () => {
    expect(await outcome(null)).toBeNull();
    expect(await outcome(null, { vista: 'olvide' })).toBeNull();
    expect(await outcome(null, { vista: 'cambiar-contrasena', redirect: '/personas' })).toEqual({
      to: '/',
      search: { redirect: '/personas' },
    });
  });

  it('con sesión va al inicio o adonde iba', async () => {
    expect(await outcome(me())).toEqual({ to: '/inicio', search: undefined });
    expect((await outcome(me(), { redirect: '/anuncios' }))?.to).toBe('/anuncios');
    expect((await outcome(me(), { redirect: '//evil.example' }))?.to).toBe('/inicio');
  });

  it('con un paso pendiente se queda en esa vista (y no en otra)', async () => {
    const pending = me({ restriction: 'password_change' });
    expect(await outcome(pending, { vista: 'cambiar-contrasena' })).toBeNull();
    expect(await outcome(pending)).toEqual({ to: '/', search: { vista: 'cambiar-contrasena' } });
    expect(await outcome(pending, { vista: 'olvide' })).toEqual({
      to: '/',
      search: { vista: 'cambiar-contrasena' },
    });
  });
});
