import { Badge, Button, Card, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi, type CellReport } from '../../../../../../api/cells';
import { requirePermission } from '../../../../../../auth/guards';
import { meQuery } from '../../../../../../auth/session';
import { FormError } from '../../../../../../components/FormError';
import { AnchorLink } from '../../../../../../components/links';
import { cellDetailQuery } from '../../../../../../features/cells/queries';
import { ReportForm } from '../../../../../../features/cells/ReportForm';
import { formatDate, fullName } from '../../../../../../features/people/format';
import { errorMessage } from '../../../../../../i18n/errors';
import { PageHeader } from '../../../../../../layout/PageHeader';

const OFFERING_COLORS = { pending: 'yellow', confirmed: 'teal', rejected: 'red' } as const;

export const Route = createFileRoute('/_shell/_church/celulas/$id/reportes/$reportId')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'celulas.ver_reportes', 'celulas.reportar'),
  component: ReportPage,
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card withBorder radius="md" p="sm">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="xl">
        {value}
      </Text>
    </Card>
  );
}

function People({ title, people }: { title: string; people: CellReport['attendance'] }) {
  if (people.length === 0) return null;
  return (
    <div>
      <Text size="xs" c="dimmed" mb={4}>
        {title}
      </Text>
      <Group gap={6}>
        {people.map((p) => (
          <AnchorLink key={p.id} to="/personas/$id" params={{ id: String(p.id) }} size="sm">
            {fullName(p)}
          </AnchorLink>
        ))}
      </Group>
    </div>
  );
}

function ReportPage() {
  const { t, i18n } = useTranslation(['cells', 'common']);
  const params = Route.useParams();
  const cellId = Number(params.id);
  const reportId = Number(params.reportId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const [editing, setEditing] = useState(false);
  const report = useQuery({
    queryKey: ['reports', 'detail', reportId],
    queryFn: () => reportsApi.get(reportId),
  });
  // Los integrantes (para corregir la asistencia) salen de la célula.
  const cell = useQuery({ ...cellDetailQuery(cellId, me.user.id), enabled: editing });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['cells'] });
  };

  const remove = (r: CellReport) =>
    modals.openConfirmModal({
      title: t('report.deleteTitle', { date: formatDate(r.meetingDate) }),
      children: <Text size="sm">{t('report.deleteBody')}</Text>,
      labels: { confirm: t('report.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await reportsApi.remove(r.id);
          refresh();
          notifications.show({ color: 'teal', message: t('report.deleted') });
          void navigate({ to: '/celulas/$id', params: { id: String(cellId) } });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  if (report.isPending) return <Loader />;
  if (report.isError) return <FormError error={report.error} />;
  const r = report.data;
  const money = (v: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage ?? 'es', {
      style: 'currency',
      currency: me.account?.currency ?? 'ARS',
    }).format(v);

  if (editing) {
    return (
      <>
        <PageHeader
          back={{ to: '/celulas/$id', params: { id: params.id } }}
          title={t('report.editTitle')}
          description={`${r.cell.name} · ${formatDate(r.meetingDate)}`}
        />
        {cell.isPending ? (
          <Loader />
        ) : cell.isError || !me.account ? (
          <FormError error={cell.error} />
        ) : (
          <ReportForm
            cell={cell.data}
            owner={{ accountId: me.account.id, userId: me.user.id }}
            report={r}
            currency={me.account.currency}
            onCancel={() => setEditing(false)}
            onDone={(result) => {
              if ('report' in result)
                queryClient.setQueryData(['reports', 'detail', reportId], result.report);
              refresh();
              setEditing(false);
              notifications.show({ color: 'teal', message: t('form.saved') });
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ to: '/celulas/$id', params: { id: params.id } }}
        title={t('report.title', { date: formatDate(r.meetingDate) })}
        badge={
          <Badge variant="light" color={r.held ? 'teal' : 'gray'}>
            {r.held ? t('report.held') : t('report.notHeld')}
          </Badge>
        }
        description={r.cell.name}
        actions={
          r.access.edit && (
            <Group gap="xs">
              <Button leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>
                {t('report.edit')}
              </Button>
              <Button
                variant="default"
                color="red"
                leftSection={<IconTrash size={18} />}
                onClick={() => remove(r)}
              >
                {t('report.delete')}
              </Button>
            </Group>
          )
        }
      />
      <Stack gap="md">
        {r.held ? (
          <>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <Stat label={t('report.stats.members')} value={r.totals.members} />
              <Stat label={t('report.stats.visitors')} value={r.totals.visitors} />
              <Stat label={t('report.stats.children')} value={r.totals.children} />
              <Stat label={t('report.stats.total')} value={r.totals.total} />
            </SimpleGrid>
            <Card withBorder radius="lg">
              <Stack gap="sm">
                <People title={t('report.present')} people={r.attendance} />
                <People title={t('report.visitors')} people={r.visitors} />
                {r.anonymousVisitors > 0 && (
                  <Text size="sm">{t('report.anonymousCount', { count: r.anonymousVisitors })}</Text>
                )}
                {r.topic && (
                  <div>
                    <Text size="xs" c="dimmed">
                      {t('report.topic')}
                    </Text>
                    <Text size="sm">{r.topic}</Text>
                  </div>
                )}
                {r.offeringAmount !== null && (
                  <div>
                    <Text size="xs" c="dimmed">
                      {t('report.offering')}
                    </Text>
                    <Group gap="xs">
                      <Text size="sm">{money(r.offeringAmount)}</Text>
                      {r.offeringStatus && (
                        <Badge size="xs" variant="light" color={OFFERING_COLORS[r.offeringStatus]}>
                          {t(`report.offeringStatus.${r.offeringStatus}`)}
                        </Badge>
                      )}
                    </Group>
                  </div>
                )}
              </Stack>
            </Card>
          </>
        ) : (
          <Card withBorder radius="lg">
            <Text size="xs" c="dimmed">
              {t('report.notHeldReason')}
            </Text>
            <Text size="sm">{r.notHeldReason}</Text>
          </Card>
        )}
        {r.notes && (
          <Card withBorder radius="lg">
            <Title order={3} size="h6" mb={4}>
              {t('report.notes')}
            </Title>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {r.notes}
            </Text>
          </Card>
        )}
        <Text size="xs" c="dimmed">
          {t('report.submittedAt', { date: dayjs(r.submittedAt).format('L LT') })}
        </Text>
      </Stack>
    </>
  );
}
