import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { landingApi } from '../../api/landing';
import landing from '../../locales/es/landing.json';
import { PlansSection } from './PlansSection';

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ lng: 'es', resources: { es: { landing } }, defaultNS: 'landing' });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderSection() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MantineProvider>
        <PlansSection />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('PlansSection', () => {
  it('muestra el precio en pesos o "Precio a definir", usuarios, espacio y días de prueba', async () => {
    vi.spyOn(landingApi, 'plans').mockResolvedValue({
      trialDays: 30,
      items: [
        { code: 'basic', name: 'Básico', userLimit: 5, storageLimitMb: 1024, priceArs: null },
        { code: 'pro', name: 'Pro', userLimit: 40, storageLimitMb: 20480, priceArs: 45000 },
      ],
    });
    renderSection();

    expect(await screen.findByText('Básico')).toBeInTheDocument();
    expect(screen.getByText('Precio a definir')).toBeInTheDocument();
    expect(screen.getByText(/45\.000/)).toBeInTheDocument();
    expect(screen.getByText('Hasta 5 usuarios')).toBeInTheDocument();
    expect(screen.getByText(/^20\sGB para archivos/)).toBeInTheDocument();
    expect(screen.getByText(/Probalo gratis 30 días/)).toBeInTheDocument();
  });

  it('sin planes muestra un mensaje neutro', async () => {
    vi.spyOn(landingApi, 'plans').mockResolvedValue({ trialDays: 30, items: [] });
    renderSection();
    expect(await screen.findByText('Pronto vas a ver los planes acá.')).toBeInTheDocument();
  });

  it('si falla la carga no rompe la página', async () => {
    vi.spyOn(landingApi, 'plans').mockRejectedValue(new Error('network'));
    renderSection();
    // La consulta reintenta una vez antes de dar el error.
    expect(
      await screen.findByText(/No pudimos cargar los planes/, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
