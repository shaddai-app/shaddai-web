import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

// El mail de "olvidé mi contraseña" apunta acá: la contraseña nueva se crea en la tarjeta del home.
export const Route = createFileRoute('/restablecer')({
  validateSearch: z.object({ token: z.string().optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { vista: 'restablecer', token: search.token }, replace: true });
  },
});
