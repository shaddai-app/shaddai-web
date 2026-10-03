import { createFileRoute, redirect } from '@tanstack/react-router';

// El cambio obligatorio se hace en la tarjeta del home (el voluntario, en Configuración → Seguridad).
export const Route = createFileRoute('/cambiar-contrasena')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { vista: 'cambiar-contrasena' }, replace: true });
  },
});
