import { Alert, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { requirePermission } from '../../../../../../auth/guards';
import { meQuery } from '../../../../../../auth/session';
import { FormError } from '../../../../../../components/FormError';
import { cellDetailQuery } from '../../../../../../features/cells/queries';
import { ReportForm, type ReportResult } from '../../../../../../features/cells/ReportForm';
import { meetingLabel } from '../../../../../../features/cells/structure';
import { PageHeader } from '../../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/celulas/$id/reportes/nuevo')({
  // Desde dónde se abrió, para volver ahí al terminar.
  validateSearch: z.object({ from: z.enum(['mi-celula']).optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.reportar'),
  component: NewReportPage,
});

function NewReportPage() {
  const { t } = useTranslation('cells');
  const id = Number(Route.useParams().id);
  const { from } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const cell = useQuery(cellDetailQuery(id, me.user.id));

  const back = () =>
    from === 'mi-celula'
      ? navigate({ to: '/mi-celula' })
      : navigate({ to: '/celulas/$id', params: { id: String(id) } });

  const done = (result: ReportResult) => {
    if ('queued' in result) {
      notifications.show({ color: 'yellow', autoClose: 8000, message: t('report.queued') });
    } else {
      notifications.show({ color: 'teal', message: t('report.sent') });
      void queryClient.invalidateQueries({ queryKey: ['cells'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
    void back();
  };

  if (cell.isPending) return <Loader />;
  if (cell.isError) return <FormError error={cell.error} />;
  const c = cell.data;
  const open = c.status === 'active' || c.status === 'paused';

  return (
    <>
      <PageHeader
        title={t('report.newTitle')}
        description={`${c.name} · ${meetingLabel(c.meetingDay, c.meetingTime)}`}
      />
      {!c.access.report || !open || !me.account ? (
        <Alert color="yellow" variant="light">
          {open ? t('report.forbidden') : t('report.cellClosed')}
        </Alert>
      ) : (
        <ReportForm
          cell={c}
          owner={{ accountId: me.account.id, userId: me.user.id }}
          currency={me.account.currency}
          onDone={done}
          onCancel={() => void back()}
        />
      )}
    </>
  );
}
