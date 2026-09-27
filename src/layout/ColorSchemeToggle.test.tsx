import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import common from '../locales/es/common.json';
import { ColorSchemeToggle } from './ColorSchemeToggle';

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ lng: 'es', resources: { es: { common } }, defaultNS: 'common' });
});

describe('ColorSchemeToggle', () => {
  it('cicla claro → oscuro → sistema (sin sesión no llama a la API)', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider defaultColorScheme="light">
          <ColorSchemeToggle />
        </MantineProvider>
      </QueryClientProvider>,
    );
    const button = () => screen.getByRole('button');
    expect(button()).toHaveAccessibleName('Tema: Claro');
    fireEvent.click(button());
    expect(button()).toHaveAccessibleName('Tema: Oscuro');
    fireEvent.click(button());
    expect(button()).toHaveAccessibleName('Tema: Según el sistema');
  });
});
