import { createFileRoute, redirect } from '@tanstack/react-router';

// Recuperar la contraseña es una vista de la tarjeta del home; la ruta queda para enlaces viejos.
export const Route = createFileRoute('/olvide-contrasena')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { vista: 'olvide' }, replace: true });
  },
});
