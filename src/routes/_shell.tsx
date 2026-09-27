import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireShell } from '../auth/guards';
import { meQuery } from '../auth/session';
import { useSession } from '../auth/session-store';
import { useApplyPreferences } from '../auth/use-preferences';
import { AppShellLayout } from '../layout/AppShellLayout';

// Layout de toda la app con sesión completa (iglesia y plataforma).
export const Route = createFileRoute('/_shell')({
  beforeLoad: requireShell,
  component: Shell,
});

function Shell() {
  // Suscripción explícita: al entrar/salir de una sesión de soporte cambia la clave de /me
  // y el layout (menú, avatar, banner) tiene que reflejar al usuario correcto.
  useSession((s) => s.support?.accessToken);
  const { data: me } = useSuspenseQuery(meQuery());
  useApplyPreferences(me);
  return (
    <AppShellLayout me={me}>
      <Outlet />
    </AppShellLayout>
  );
}
