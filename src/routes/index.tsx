import { createFileRoute } from '@tanstack/react-router';
import { redirectIfLoggedIn } from '../auth/guards';
import { Landing } from '../features/landing/Landing';

// Home público: la página de presentación con el ingreso. Con sesión, directo al inicio (o al paso pendiente).
export const Route = createFileRoute('/')({
  beforeLoad: (args) => redirectIfLoggedIn(args),
  component: Landing,
});
