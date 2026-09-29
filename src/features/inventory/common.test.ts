import { describe, expect, it } from 'vitest';
import { qrTokenFrom } from './common';

describe('QR de las etiquetas', () => {
  const token = 'AbCdEfGhIjKlMnOpQrSt_-';

  it('reconoce la URL de una etiqueta, de cualquier dominio de la app', () => {
    expect(qrTokenFrom(`https://app.shaddai.com/i/${token}`)).toBe(token);
    expect(qrTokenFrom(`http://localhost:5173/i/${token}`)).toBe(token);
    expect(qrTokenFrom(`/i/${token}`)).toBe(token);
  });

  it('descarta otros QR', () => {
    expect(qrTokenFrom('https://example.com/')).toBeNull();
    expect(qrTokenFrom(`https://app.shaddai.com/i/${token}x`)).toBeNull();
    expect(qrTokenFrom('https://app.shaddai.com/nuevo/iglesia-demo')).toBeNull();
    expect(qrTokenFrom('WIFI:S:red;T:WPA;P:clave;;')).toBeNull();
  });
});
