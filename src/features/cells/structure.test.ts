import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { afterEach, describe, expect, it } from 'vitest';
import { meetingLabel, weekdayOptions } from './structure';

afterEach(() => void dayjs.locale('en'));

describe('días de reunión', () => {
  it('empiezan por el primer día de la semana de la cuenta (0 = domingo)', () => {
    expect(weekdayOptions(1).map((o) => o.value)).toEqual(['1', '2', '3', '4', '5', '6', '0']);
    expect(weekdayOptions(0).map((o) => o.value)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });

  it('usan el idioma actual y van con mayúscula', () => {
    dayjs.locale('es');
    expect(weekdayOptions(1)[0]?.label).toBe('Lunes');
    expect(meetingLabel(3, '20:00')).toBe('Miércoles 20:00');
  });
});
