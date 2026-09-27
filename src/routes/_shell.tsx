import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireShell } from '../auth/guards';
import { meQuery } from '../auth/session';
import { useApplyPreferences } from '../auth/use-preferences';
import { AppShellLayout } from '../layout/AppShellLayout';

// Layout de toda la app con sesión completa (iglesia y plataforma).
export const Route = createFileRoute('/_shell')({
  beforeLoad: requireShell,
  component: Shell,
});

function Shell() {
  const { data: me } = useSuspenseQuery(meQuery());
  useApplyPreferences(me);
  return (
    <AppShellLayout me={me}>
      <Outlet />
    </AppShellLayout>
  );
}
