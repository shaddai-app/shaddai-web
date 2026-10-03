import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

// El ingreso vive en el home. Se conserva la ruta para enlaces viejos (mails de acceso, favoritos).
export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional(), closed: z.literal(1).optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search, replace: true });
  },
});
