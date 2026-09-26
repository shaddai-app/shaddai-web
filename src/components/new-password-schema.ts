import { z } from 'zod';

/** Reglas mínimas en el front; la fortaleza real (frases comunes, etc.) la valida la API. */
export const newPasswordSchema = z
  .object({ newPassword: z.string().min(10, 'passwordMin').max(128), confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'passwordsMatch' });
