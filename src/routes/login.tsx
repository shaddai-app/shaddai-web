import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { redirectIfLoggedIn } from '../auth/guards';
import { LoginForm } from '../features/auth/LoginForm';
import { AuthLayout } from '../layout/AuthLayout';

export const Route = createFileRoute('/login')({
  // closed: se llega acá después de dar de baja la cuenta de la iglesia.
  validateSearch: z.object({ redirect: z.string().optional(), closed: z.literal(1).optional() }),
  beforeLoad: (args) => redirectIfLoggedIn(args, args.search.redirect),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, closed } = Route.useSearch();
  return (
    <AuthLayout>
      <LoginForm redirect={redirect} closed={Boolean(closed)} />
    </AuthLayout>
  );
}
