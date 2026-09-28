import { IconBuildingBank, IconCash, IconWallet, type Icon } from '@tabler/icons-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  financeApi,
  type AccountType,
  type CategoryKind,
  type FinanceCategory,
  type MovementKind,
} from '../../api/finance';

export const ACCOUNT_ICONS: Record<AccountType, Icon> = {
  cash: IconCash,
  bank: IconBuildingBank,
  wallet: IconWallet,
};

export const accountsQuery = (includeInactive = false) => ({
  queryKey: ['finance', 'accounts', { includeInactive }],
  queryFn: () => financeApi.accounts(includeInactive).then((r) => r.items),
  staleTime: 30_000,
});

export const categoriesQuery = (kind?: CategoryKind, includeInactive = false) => ({
  queryKey: ['finance', 'categories', { kind, includeInactive }],
  queryFn: () => financeApi.categories({ kind, includeInactive }).then((r) => r.items),
  staleTime: 60_000,
});

/** Nombre visible: el que puso la iglesia o la traducción de la categoría por defecto. */
export function useCategoryLabel() {
  const { t, i18n } = useTranslation('finance');
  return useCallback(
    (c: Pick<FinanceCategory, 'name' | 'systemKey'> | null | undefined) => {
      if (!c) return '';
      if (c.name) return c.name;
      const key = `categories.defaults.${c.systemKey}`;
      return i18n.exists(key, { ns: 'finance' }) ? t(key as never) : (c.systemKey ?? '');
    },
    [t, i18n],
  );
}

/**
 * Formato de dinero en el idioma del usuario y la moneda de la caja. En español se usan las
 * convenciones de Argentina: "$ 1.234,50" para pesos y "US$ 1.234,50" para dólares (sin ambigüedad).
 */
export function useMoney() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'es';
  const locale = lang === 'es' ? 'es-AR' : lang;
  return useCallback(
    (value: number, currency: string, opts: { signed?: boolean } = {}) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        signDisplay: opts.signed ? 'exceptZero' : 'auto',
      }).format(value),
    [locale],
  );
}

/** Ingresos y transferencias recibidas suman; el resto resta. */
export const isInflow = (kind: MovementKind) => kind === 'income' || kind === 'transfer_in';
export const signedAmount = (kind: MovementKind, amount: number) => (isInflow(kind) ? amount : -amount);
export const kindColor = (kind: MovementKind) => (isInflow(kind) ? 'teal' : 'red');
