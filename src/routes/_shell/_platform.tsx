import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requirePlatform } from '../../auth/guards';

// Panel de plataforma: solo el superadmin en su propia sesión.
export const Route = createFileRoute('/_shell/_platform')({
  beforeLoad: ({ context }) => requirePlatform(context.me),
  component: Outlet,
});
