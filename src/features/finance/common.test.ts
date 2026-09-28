import { describe, expect, it } from 'vitest';
import { isInflow, kindColor, signedAmount } from './common';

describe('signo de los movimientos', () => {
  it('ingresos y transferencias recibidas suman; egresos y enviadas restan', () => {
    expect([
      isInflow('income'),
      isInflow('transfer_in'),
      isInflow('expense'),
      isInflow('transfer_out'),
    ]).toEqual([true, true, false, false]);
    expect(signedAmount('expense', 150.5)).toBe(-150.5);
    expect(signedAmount('transfer_in', 20)).toBe(20);
    expect(kindColor('transfer_out')).toBe('red');
  });
});
