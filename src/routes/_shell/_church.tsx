import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireChurch } from '../../auth/guards';
import { meQuery } from '../../auth/session';
import { OutboxSync } from '../../pwa/OutboxSync';

// Pantallas de la iglesia (usuarios de cuenta, o el superadmin en una sesión de soporte).
export const Route = createFileRoute('/_shell/_church')({
  beforeLoad: ({ context }) => requireChurch(context.me),
  component: ChurchLayout,
});

function ChurchLayout() {
  const { data: me } = useSuspenseQuery(meQuery());
  return (
    <>
      {/* Reportes cargados sin señal: se envían solos al volver la conexión (no en sesión de soporte). */}
      {me.account && !me.impersonation && (
        <OutboxSync owner={{ accountId: me.account.id, userId: me.user.id }} />
      )}
      <Outlet />
    </>
  );
}
