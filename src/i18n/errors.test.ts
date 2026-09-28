import { beforeAll, describe, expect, it } from 'vitest';
import { ApiError } from '../api/http';
import { errorMessage } from './errors';
import i18n from './index';

beforeAll(async () => {
  await i18n.changeLanguage('es');
  await i18n.loadNamespaces('errors');
});

describe('mensajes de error', () => {
  it('nombra el mes cerrado con los detalles de la API', () => {
    const err = new ApiError(409, 'PERIOD_CLOSED', { year: 2026, month: 8 });
    expect(errorMessage(err)).toBe(
      'El mes está cerrado (agosto 2026): no se puede cargar ni modificar nada con esa fecha.',
    );
  });

  it('un código desconocido cae en el mensaje genérico', () => {
    expect(errorMessage(new ApiError(500, 'NUEVO_CODIGO'))).toBe(i18n.t('errors:generic'));
  });
});
