import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi } from '../api/cells';
import { ApiError } from '../api/http';
import { errorMessage } from '../i18n/errors';
import { notifyDraftsChanged, reportDrafts, type Owner } from './report-drafts';
import { isNetworkError } from './snapshots';

/**
 * Envía los reportes que quedaron en cola sin señal: al montar, al volver la conexión, al volver a la
 * app y cada minuto. Un reporte ya cargado para esa fecha (REPORT_EXISTS) cuenta como enviado.
 */
export function OutboxSync({ owner }: { owner: Owner }) {
  const { t } = useTranslation('cells');
  const queryClient = useQueryClient();
  const { accountId, userId } = owner;

  useEffect(() => {
    const me = { accountId, userId };
    let running = false;
    const flush = async () => {
      if (running || !navigator.onLine) return;
      running = true;
      let changed = false;
      try {
        for (const draft of await reportDrafts.pending(me)) {
          if (draft.status !== 'queued') continue;
          try {
            await reportsApi.create(draft.cellId, draft.input);
            await reportDrafts.remove(me, draft.cellId);
            notifications.show({ color: 'teal', message: t('report.queuedSent', { cell: draft.cellName }) });
          } catch (err) {
            // Sin señal todavía, o la sesión se cerró (se envía después de volver a entrar).
            if (isNetworkError(err) || (err instanceof ApiError && err.status === 401)) break;
            if (err instanceof ApiError && err.code === 'REPORT_EXISTS') {
              await reportDrafts.remove(me, draft.cellId);
              notifications.show({
                color: 'blue',
                message: t('report.queuedExists', { cell: draft.cellName }),
              });
            } else {
              await reportDrafts.save(me, {
                ...draft,
                status: 'error',
                errorCode: err instanceof ApiError ? err.code : undefined,
              });
              notifications.show({
                color: 'red',
                autoClose: false,
                title: t('report.queuedFailed', { cell: draft.cellName }),
                message: errorMessage(err),
              });
            }
          }
          changed = true;
        }
      } finally {
        running = false;
        if (changed) {
          notifyDraftsChanged();
          void queryClient.invalidateQueries({ queryKey: ['cells'] });
          void queryClient.invalidateQueries({ queryKey: ['reports'] });
        }
      }
    };

    void flush();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void flush();
    };
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void flush(), 60_000);
    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [accountId, userId, queryClient, t]);

  return null;
}
