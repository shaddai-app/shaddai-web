import { describe, expect, it } from 'vitest';
import { denominationsFor, draftTotals, incompleteRows, linesFromDraft, type CountDraft } from './counts';

const draft: CountDraft = {
  cashCategoryId: 2,
  bills: { '1000': 12, '500': 7, '100': '', '20000': 0 },
  others: [
    { key: 'a', categoryId: 2, paymentMethod: 'transfer', amount: 5000.1 },
    { key: 'b', categoryId: null, paymentMethod: 'card', amount: 300 }, // sin categoría: no va
  ],
  envelopes: [
    {
      key: 'c',
      person: { id: 9, firstName: 'Ana', lastName: 'Paz', phone: null },
      categoryId: 1,
      paymentMethod: 'cash',
      amount: 20000,
    },
    { key: 'd', person: null, categoryId: 1, paymentMethod: 'cash', amount: 1 }, // sin persona: no va
  ],
};

describe('arqueo', () => {
  it('arma los renglones: billetes con cantidad, otros con categoría y sobres con persona', () => {
    expect(linesFromDraft(draft)).toEqual([
      { categoryId: 2, paymentMethod: 'cash', denomination: 1000, quantity: 12 },
      { categoryId: 2, paymentMethod: 'cash', denomination: 500, quantity: 7 },
      { categoryId: 2, paymentMethod: 'transfer', amount: 5000.1 },
      { categoryId: 1, paymentMethod: 'cash', amount: 20000, personId: 9 },
    ]);
  });

  it('suma lo que se guarda, en centavos y por medio de pago', () => {
    const totals = draftTotals(draft);
    expect(totals.bills).toBe(15500);
    expect(totals.byMethod).toEqual([
      { method: 'cash', amount: 35500 },
      { method: 'transfer', amount: 5000.1 },
    ]);
    expect(totals.total).toBe(40500.1);
    expect(incompleteRows(draft)).toBe(2);
  });

  it('denominaciones de la moneda más las que ya se usaron', () => {
    expect(denominationsFor('USD', [3])).toEqual([100, 50, 20, 10, 5, 3, 2, 1]);
    expect(denominationsFor('XYZ')[0]).toBe(1000);
  });
});
