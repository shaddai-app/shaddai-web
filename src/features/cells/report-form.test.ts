import { describe, expect, it } from 'vitest';
import { emptyReport, lastMeetingDate, missing, toInput, totals, type ReportFormState } from './report-form';

// 2026-09-27 es domingo.
const TODAY = '2026-09-27';

describe('fecha por defecto del reporte', () => {
  it('es la última reunión hasta hoy inclusive', () => {
    expect(lastMeetingDate(TODAY, 0)).toBe('2026-09-27'); // se reúnen los domingos: hoy
    expect(lastMeetingDate(TODAY, 3)).toBe('2026-09-23'); // miércoles pasado
    expect(lastMeetingDate(TODAY, 6)).toBe('2026-09-26'); // ayer, sábado
  });
});

const filled = (): ReportFormState => ({
  ...emptyReport(TODAY, 3),
  attendance: [1, 2, 3],
  visitors: [{ id: 9, firstName: 'Ana', lastName: 'Ruiz', phone: null }],
  newVisitors: [
    { firstName: ' Juan ', lastName: 'Paz', phone: ' ' },
    { firstName: 'Sin apellido', lastName: '', phone: '' }, // fila a medio escribir: no se manda
  ],
  anonymousVisitors: 2,
  childrenCount: 4,
  offering: '1500,50',
  topic: ' Fe ',
});

describe('toInput', () => {
  it('manda asistencia, visitas completas y ofrenda normalizadas', () => {
    expect(toInput(filled())).toMatchObject({
      meetingDate: '2026-09-23',
      held: true,
      attendance: [1, 2, 3],
      visitors: [9],
      newVisitors: [{ firstName: 'Juan', lastName: 'Paz', phone: null }],
      anonymousVisitors: 2,
      childrenCount: 4,
      offeringAmount: 1500.5,
      topic: 'Fe',
      notHeldReason: null,
    });
  });

  it('sin reunión no manda asistencia (la API la rechaza) y exige el motivo', () => {
    const s = { ...filled(), held: false, notHeldReason: '' };
    expect(missing(s)).toBe('reason');
    const input = toInput({ ...s, notHeldReason: 'Lluvia' });
    expect(input).toMatchObject({
      held: false,
      notHeldReason: 'Lluvia',
      attendance: [],
      visitors: [],
      newVisitors: [],
      anonymousVisitors: 0,
      childrenCount: 0,
      offeringAmount: null,
    });
    expect(missing({ ...s, notHeldReason: 'Lluvia' })).toBeNull();
  });
});

describe('totales', () => {
  it('cuentan integrantes, visitas (con y sin ficha, nuevas completas) y niños', () => {
    expect(totals(filled())).toEqual({ members: 3, visitors: 4, children: 4, total: 11 });
    expect(totals({ ...filled(), held: false }).total).toBe(0);
  });
});
