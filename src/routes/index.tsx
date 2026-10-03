import { createFileRoute } from '@tanstack/react-router';
import { guardHome } from '../auth/guards';
import { homeSearchSchema } from '../auth/views';
import { Landing } from '../features/landing/Landing';

// Home público: la landing con la tarjeta de ingreso (login, recuperación y pasos obligatorios en
// `?vista=`). Con sesión, directo al inicio salvo un paso obligatorio pendiente.
export const Route = createFileRoute('/')({
  validateSearch: homeSearchSchema,
  beforeLoad: ({ context, search }) => guardHome({ context }, search),
  component: Landing,
});
