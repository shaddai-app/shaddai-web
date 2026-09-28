import type { CountLineInput, OfferingCountDetail, PaymentMethod } from '../../api/finance';
import type { PersonOption } from '../people/PersonPicker';

// Editor del arqueo: billetes y monedas por denominación (una categoría para todo lo suelto en
// efectivo), otros ingresos por medio de pago y sobres con nombre.

/** Billetes y monedas en circulación, del más grande al más chico. */
const DENOMINATIONS: Record<string, number[]> = {
  ARS: [20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10],
  USD: [100, 50, 20, 10, 5, 2, 1],
  BRL: [200, 100, 50, 20, 10, 5, 2, 1],
  EUR: [500, 200, 100, 50, 20, 10, 5, 2, 1],
};
const GENERIC = [1000, 500, 100, 50, 20, 10, 5, 1];

/** Denominaciones a mostrar: las de la moneda más las que ya tenga el arqueo, sin repetir. */
export function denominationsFor(currency: string, used: number[] = []) {
  const base = DENOMINATIONS[currency] ?? GENERIC;
  return [...new Set([...base, ...used])].sort((a, b) => b - a);
}

export interface OtherRow {
  key: string;
  categoryId: number | null;
  paymentMethod: PaymentMethod;
  amount: number | '';
}

export interface EnvelopeRow {
  key: string;
  person: PersonOption | null;
  categoryId: number | null;
  paymentMethod: PaymentMethod;
  amount: number | '';
}

export interface CountDraft {
  cashCategoryId: number | null;
  /** denominación → cantidad */
  bills: Record<string, number | ''>;
  others: OtherRow[];
  envelopes: EnvelopeRow[];
}

let seq = 0;
export const rowKey = () => `r${++seq}`;

const cents = (v: number | '' | null | undefined) => (v ? Math.round(Number(v) * 100) : 0);

export function draftFromDetail(detail: OfferingCountDetail, defaultCashCategory: number | null): CountDraft {
  const bills: Record<string, number | ''> = {};
  let cashCategoryId: number | null = null;
  const others: OtherRow[] = [];
  const envelopes: EnvelopeRow[] = [];
  for (const l of detail.lines) {
    if (l.denomination !== null && l.quantity !== null) {
      bills[String(l.denomination)] = l.quantity;
      cashCategoryId ??= l.category.id;
    } else if (l.nominal) {
      envelopes.push({
        key: rowKey(),
        person: l.person ? { ...l.person, phone: null } : null,
        categoryId: l.category.id,
        paymentMethod: l.paymentMethod,
        amount: l.amount,
      });
    } else {
      others.push({
        key: rowKey(),
        categoryId: l.category.id,
        paymentMethod: l.paymentMethod,
        amount: l.amount,
      });
    }
  }
  return { cashCategoryId: cashCategoryId ?? defaultCashCategory, bills, others, envelopes };
}

/** Renglones que se mandan a la API (lo vacío o en cero no se manda). */
export function linesFromDraft(d: CountDraft): CountLineInput[] {
  const bills = Object.entries(d.bills)
    .filter(([, q]) => q && Number(q) > 0 && d.cashCategoryId)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([denomination, quantity]) => ({
      categoryId: d.cashCategoryId!,
      paymentMethod: 'cash' as const,
      denomination: Number(denomination),
      quantity: Number(quantity),
    }));
  const others = d.others
    .filter((o) => o.categoryId && cents(o.amount) > 0)
    .map((o) => ({ categoryId: o.categoryId!, paymentMethod: o.paymentMethod, amount: Number(o.amount) }));
  const envelopes = d.envelopes
    .filter((e) => e.person && e.categoryId && cents(e.amount) > 0)
    .map((e) => ({
      categoryId: e.categoryId!,
      paymentMethod: e.paymentMethod,
      amount: Number(e.amount),
      personId: e.person!.id,
    }));
  return [...bills, ...others, ...envelopes];
}

/**
 * Totales de lo que se va a guardar (los renglones incompletos no cuentan), en centavos para no
 * acumular errores de coma flotante.
 */
export function draftTotals(d: CountDraft) {
  const byMethod = new Map<PaymentMethod, number>();
  let bills = 0;
  for (const l of linesFromDraft(d)) {
    const value = l.denomination ? cents(l.denomination) * (l.quantity ?? 0) : cents(l.amount);
    if (l.denomination) bills += value;
    byMethod.set(l.paymentMethod, (byMethod.get(l.paymentMethod) ?? 0) + value);
  }
  const total = [...byMethod.values()].reduce((a, b) => a + b, 0);
  return {
    bills: bills / 100,
    total: total / 100,
    byMethod: [...byMethod.entries()].map(([method, v]) => ({ method, amount: v / 100 })),
  };
}

/** Renglones a medio cargar (monto sin categoría o sin persona): se avisan antes de guardar. */
export const incompleteRows = (d: CountDraft) =>
  d.others.filter((o) => cents(o.amount) > 0 && !o.categoryId).length +
  d.envelopes.filter((e) => cents(e.amount) > 0 && (!e.person || !e.categoryId)).length;
