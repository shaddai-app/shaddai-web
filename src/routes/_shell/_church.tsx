import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireChurch } from '../../auth/guards';

// Pantallas de la iglesia (usuarios de cuenta, o el superadmin en una sesión de soporte).
export const Route = createFileRoute('/_shell/_church')({
  beforeLoad: ({ context }) => requireChurch(context.me),
  component: Outlet,
});
