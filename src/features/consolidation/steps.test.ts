import { describe, expect, it } from 'vitest';
import { whatsappHref } from './steps';

describe('enlace de WhatsApp', () => {
  it('solo con teléfono internacional; el saludo va codificado', () => {
    expect(whatsappHref('+54 9 11 4005-5433', '¡Hola Ana! ')).toBe(
      'https://wa.me/5491140055433?text=%C2%A1Hola%20Ana!%20',
    );
    expect(whatsappHref('+5491140055433')).toBe('https://wa.me/5491140055433');
    expect(whatsappHref('11 5555 0101')).toBeNull();
    expect(whatsappHref(null)).toBeNull();
  });
});
