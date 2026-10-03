import { z } from 'zod';

/**
 * Vistas de la tarjeta de ingreso del home (`/?vista=`): sin vista es el login (con su paso de 2FA).
 * Las dos últimas son pasos obligatorios con sesión (contraseña temporal, 2FA del superadmin).
 */
export const AUTH_VIEWS = ['olvide', 'restablecer', 'cambiar-contrasena', 'configurar-2fa'] as const;
export type AuthView = (typeof AUTH_VIEWS)[number];
export type PendingStep = Extract<AuthView, 'cambiar-contrasena' | 'configurar-2fa'>;

export const homeSearchSchema = z.object({
  vista: z.enum(AUTH_VIEWS).optional(),
  // Enlace de "olvidé mi contraseña" que llega por mail.
  token: z.string().optional(),
  // A dónde volver después de ingresar (sesión vencida en una pantalla interna).
  redirect: z.string().optional(),
  // Se llega después de dar de baja la cuenta de la iglesia.
  closed: z.literal(1).optional(),
});
export type HomeSearch = z.infer<typeof homeSearchSchema>;
