import type { ReportInput } from '../api/cells';
import type { ReportFormState } from '../features/cells/report-form';
import { kv, safe } from './idb';

// Borradores del reporte semanal: se guardan mientras el líder escribe y, si al enviar no hay señal,
// quedan en cola hasta que vuelva la conexión (ver OutboxSync).

export type DraftStatus = 'editing' | 'queued' | 'error';

export interface ReportDraft {
  cellId: number;
  cellName: string;
  /** Lo que se ve en pantalla (para retomarlo). */
  form: ReportFormState;
  /** Lo que se envía (lo usa la cola sin abrir el formulario). */
  input: ReportInput;
  status: DraftStatus;
  /** Código de error de la API cuando el reenvío automático fue rechazado. */
  errorCode?: string;
  updatedAt: number;
}

/** Un borrador por usuario y célula (en un celular compartido no se mezclan). */
const prefix = (accountId: number, userId: number) => `draft:report:${accountId}:${userId}:`;
const keyOf = (accountId: number, userId: number, cellId: number) => `${prefix(accountId, userId)}${cellId}`;

export type Owner = { accountId: number; userId: number };

export const reportDrafts = {
  get: (o: Owner, cellId: number) =>
    safe(() => kv.get<ReportDraft>(keyOf(o.accountId, o.userId, cellId)), undefined),
  save: (o: Owner, draft: Omit<ReportDraft, 'updatedAt'>) =>
    safe(
      () => kv.set(keyOf(o.accountId, o.userId, draft.cellId), { ...draft, updatedAt: Date.now() }),
      undefined,
    ),
  remove: (o: Owner, cellId: number) =>
    safe(() => kv.delete(keyOf(o.accountId, o.userId, cellId)), undefined),
  /** Borradores en cola (o rechazados) del usuario. */
  pending: async (o: Owner) => {
    const keys = await safe(() => kv.keys(prefix(o.accountId, o.userId)), []);
    const drafts = await Promise.all(keys.map((k) => safe(() => kv.get<ReportDraft>(k), undefined)));
    return drafts.filter((d): d is ReportDraft => Boolean(d && d.status !== 'editing'));
  },
};

/** Avisa a las pantallas que un borrador cambió (enviado por la cola, rechazado, etc.). */
export const draftEvents = new EventTarget();
export const notifyDraftsChanged = () => draftEvents.dispatchEvent(new Event('changed'));
