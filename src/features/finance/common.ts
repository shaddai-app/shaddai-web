import { IconBuildingBank, IconCash, IconWallet, type Icon } from '@tabler/icons-react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  financeApi,
  type AccountType,
  type CategoryKind,
  type CountStatus,
  type FinanceCategory,
  type Movement,
  type MovementKind,
  type MovementStatus,
} from '../../api/finance';
import { meQuery } from '../../auth/session';

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
    (value: number, currency: string, opts: { signed?: boolean; whole?: boolean } = {}) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        signDisplay: opts.signed ? 'exceptZero' : 'auto',
        // whole: sin centavos cuando el monto es entero (billetes, subtotales del arqueo).
        ...(opts.whole && Number.isInteger(value)
          ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
          : {}),
      }).format(value),
    [locale],
  );
}

/** Ingresos y transferencias recibidas suman; el resto resta. */
export const isInflow = (kind: MovementKind) => kind === 'income' || kind === 'transfer_in';
export const signedAmount = (kind: MovementKind, amount: number) => (isInflow(kind) ? amount : -amount);
export const kindColor = (kind: MovementKind) => (isInflow(kind) ? 'teal' : 'red');

/** Moneda de la iglesia: la de las ofrendas de célula pendientes, que todavía no tienen caja. */
export function useChurchCurrency() {
  const { data: me } = useSuspenseQuery(meQuery());
  return me.account?.currency ?? 'ARS';
}

export const STATUS_COLORS: Record<MovementStatus, string> = {
  pending: 'yellow',
  confirmed: 'teal',
  voided: 'gray',
  rejected: 'gray',
};

export const COUNT_STATUS_COLORS: Record<CountStatus, string> = {
  draft: 'yellow',
  confirmed: 'teal',
  voided: 'gray',
};

/** Origen de un movimiento generado por el sistema (ofrenda de célula o arqueo). */
export function useMovementOrigin() {
  const { t } = useTranslation('finance');
  return useCallback(
    (m: Pick<Movement, 'cellReport' | 'offeringCount'>) =>
      m.cellReport
        ? t('pending.fromCell', { cell: m.cellReport.cell.name })
        : m.offeringCount
          ? t('counts.fromCount', { title: m.offeringCount.title ?? `#${m.offeringCount.id}` })
          : null,
    [t],
  );
}

export const periodsQuery = () => ({
  queryKey: ['finance', 'periods'],
  queryFn: financeApi.periods,
  staleTime: 60_000,
  retry: false,
});

/**
 * Último día cerrado ("2026-08-31") o null. Los formularios lo usan como fecha mínima; la API igual
 * rechaza con PERIOD_CLOSED, así que si no se puede consultar no pasa nada.
 */
export function useClosedUntil(): string | null {
  const { data } = useQuery(periodsQuery());
  const last = data?.lastClosed;
  if (!last) return null;
  return new Date(Date.UTC(last.year, last.month, 0)).toISOString().slice(0, 10);
}

/** Día siguiente a una fecha ISO (para el mínimo de los campos de fecha). */
export const dayAfter = (iso: string | null) => {
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** "agosto de 2026" con la primera letra en mayúscula, en el idioma activo. */
export const monthLabel = (year: number, month: number) => {
  const text = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY');
  return text.charAt(0).toUpperCase() + text.slice(1);
};
