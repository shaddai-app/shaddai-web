import { createFileRoute, redirect } from '@tanstack/react-router';

// El alta obligatoria de la verificación en dos pasos se hace en la tarjeta del home.
export const Route = createFileRoute('/configurar-2fa')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { vista: 'configurar-2fa' }, replace: true });
  },
});
