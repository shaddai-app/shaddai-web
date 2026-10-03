import { renderHook, type RenderHookResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppNotification } from '../../api/notifications';
import i18n from '../../i18n';
import { useNotificationText } from './text';

// El hook se arma recién con el idioma cargado: si se renderiza antes, useTranslation suspende y
// result.current queda vacío (pasaba o no según lo rápido que cargaran las traducciones).
let result: RenderHookResult<ReturnType<typeof useNotificationText>, unknown>['result'];
beforeAll(async () => {
  await i18n.changeLanguage('es');
  await i18n.loadNamespaces('notifications');
  ({ result } = renderHook(() => useNotificationText(), { wrapper }));
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);
const n = (type: string, params: AppNotification['params']): AppNotification => ({
  id: 1,
  type,
  params,
  link: null,
  readAt: null,
  createdAt: new Date().toISOString(),
});

describe('texto de los avisos', () => {
  it('préstamo vencido: fecha del día', () => {
    expect(
      result.current(
        n('loan.overdue', { item: 'Parlante', code: 'EQ-0003', person: 'Marta Test', dueAt: '2026-10-01' }),
      ),
    ).toEqual({
      title: 'Préstamo vencido: Parlante',
      body: 'Marta Test lo tenía hasta el 01/10/2026 (EQ-0003).',
    });
  });

  it('consolidación sin consolidador agrega la aclaración', () => {
    const text = result.current(
      n('consolidation.overdue', { person: 'Beto', dueAt: '2026-09-28', unassigned: 1 }),
    );
    expect(text.body).toBe('El paso actual venció el 28/09/2026. El caso no tiene consolidador.');
  });

  it('turno rechazado con motivo, y un tipo desconocido', () => {
    const declined = result.current(
      n('assignment.declined', {
        person: 'Ana',
        role: 'Voz',
        event: 'Culto',
        ministry: 'Alabanza',
        startsAt: '2026-10-04T10:00',
        reason: 'Viaje',
      }),
    );
    expect(declined.title).toBe('Ana no puede servir');
    expect(declined.body).toMatch(/^Voz en Culto \(Alabanza\), .*04\/10\/2026 10:00\. Motivo: Viaje$/);
    expect(result.current(n('algo.nuevo', {}))).toEqual({ title: 'Aviso', body: '' });
  });
});
