import { useTranslation } from 'react-i18next';

/** Separadores del NumberInput según el idioma (1.234,50 / 1,234.50). */
export function useSeparators() {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage === 'en'
    ? { decimalSeparator: '.', thousandSeparator: ',' }
    : { decimalSeparator: ',', thousandSeparator: '.' };
}

/** Símbolo de la moneda en el idioma del usuario ($, US$, R$…), para el prefijo de los montos. */
export function currencySymbol(currency: string | undefined, lang: string) {
  if (!currency) return '';
  const locale = lang === 'es' ? 'es-AR' : lang;
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency
  );
}

// La última caja usada se recuerda en este dispositivo (carga rápida desde el celular).
const LAST_ACCOUNT_KEY = 'shaddai-last-finance-account';

export function readLastAccount() {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

export function rememberAccount(id: number) {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, String(id));
  } catch {
    // sin almacenamiento local no pasa nada
  }
}
