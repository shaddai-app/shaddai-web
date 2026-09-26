import { useMantineColorScheme } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { meApi } from '../api/auth';
import type { Locale, Me, ThemePreference } from '../api/types';
import { useBranding } from '../theme/branding-store';
import { meQuery } from './session';
import { sessionStore } from './session-store';

/** Idioma efectivo: el del usuario, si no el de la cuenta, si no español. */
export const effectiveLocale = (me: Me): Locale => me.user.locale ?? me.account?.defaultLocale ?? 'es';

/** Aplica al front las preferencias guardadas en el perfil (idioma, tema) y el color de la cuenta. */
export function useApplyPreferences(me: Me | undefined) {
  const { i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const setPrimaryColor = useBranding((s) => s.setPrimaryColor);

  const locale = me ? effectiveLocale(me) : undefined;
  const theme = me?.user.theme;
  const primary = me?.account?.primaryColor;

  useEffect(() => {
    if (locale && i18n.resolvedLanguage !== locale) void i18n.changeLanguage(locale);
  }, [locale, i18n]);

  useEffect(() => {
    if (theme && theme !== colorScheme) setColorScheme(theme);
    // Solo cuando cambia la preferencia guardada, no en cada toggle local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    setPrimaryColor(primary);
  }, [primary, setPrimaryColor]);
}

/**
 * Guarda una preferencia en el perfil si hay sesión propia (en soporte no se tocan las del usuario).
 * Sin sesión (login) queda solo en este navegador.
 */
export function usePersistPreference() {
  const queryClient = useQueryClient();
  return async (patch: { theme?: ThemePreference; locale?: Locale | null }) => {
    const { accessToken, support } = sessionStore.getState();
    if (!accessToken || support) return;
    try {
      const updated = await meApi.update(patch);
      queryClient.setQueryData(meQuery().queryKey, (old: Me | undefined) =>
        old ? { ...old, user: updated.user, account: updated.account } : old,
      );
    } catch {
      // Preferencia visual: si falla (ej. cuenta en solo lectura) queda aplicada localmente igual.
    }
  };
}
