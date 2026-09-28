import { Badge, Button, Card, Group, Loader, SegmentedControl, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { financeApi, type Movement } from '../../../../api/finance';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { PaginationBar } from '../../../../components/PaginationBar';
import { useChurchCurrency, useMoney } from '../../../../features/finance/common';
import { VoidModal } from '../../../../features/finance/MovementModals';
import { ConfirmPendingModal } from '../../../../features/finance/PendingModals';
import { formatDate } from '../../../../features/people/format';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  page: z.number().int().min(1).optional(),
  status: z.enum(['pending', 'rejected']).optional(),
});

export const Route = createFileRoute('/_shell/_church/finanzas/pendientes')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver', 'finanzas.confirmar_pendientes'),
  component: PendingPage,
});

const PAGE_SIZE = 30;

function PendingRow({
  m,
  canResolve,
  onConfirm,
  onReject,
}: {
  m: Movement;
  canResolve: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const currency = useChurchCurrency();
  const report = m.cellReport;
  return (
    <Card withBorder radius="lg" padding="md">
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <div style={{ minWidth: 0 }}>
          <AnchorLink to="/finanzas/movimientos/$id" params={{ id: String(m.id) }} fw={600}>
            {report ? report.cell.name : `#${m.id}`}
          </AnchorLink>
          <Text size="xs" c="dimmed">
            {report ? t('pending.meeting', { date: formatDate(report.meetingDate) }) : formatDate(m.date)}
          </Text>
          {m.status === 'rejected' && m.voidReason && (
            <Text size="sm" mt={4}>
              {m.voidReason}
            </Text>
          )}
        </div>
        <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          <Text fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {money(m.amount, m.financeAccount?.currency ?? currency)}
          </Text>
          {m.status === 'rejected' && (
            <Badge size="xs" color="gray" variant="light">
              {t('status.rejected')}
            </Badge>
          )}
        </Stack>
      </Group>
      {canResolve && m.status === 'pending' && (
        <Group gap="xs" mt="sm" grow>
          <Button color="teal" leftSection={<IconCheck size={16} />} onClick={onConfirm}>
            {t('pending.confirm')}
          </Button>
          <Button variant="default" leftSection={<IconX size={16} />} onClick={onReject}>
            {t('pending.reject')}
          </Button>
        </Group>
      )}
    </Card>
  );
}

function PendingPage() {
  const { t } = useTranslation(['finance', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const money = useMoney();
  const { data: me } = useSuspenseQuery(meQuery());
  const status = params.status ?? 'pending';
  const page = params.page ?? 1;
  const list = useQuery({
    queryKey: ['finance', 'pending', { status, page }],
    queryFn: () => financeApi.pending({ status, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const [confirming, setConfirming] = useState<Movement | null>(null);
  const [rejecting, setRejecting] = useState<Movement | null>(null);
  const canResolve = can(me, 'finanzas.confirmar_pendientes');
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['finance'] });

  return (
    <>
      <PageHeader title={t('pending.title')} description={t('pending.description')} />
      <Stack gap="md" maw={820}>
        <SegmentedControl
          value={status}
          onChange={(v) =>
            void navigate({
              search: { status: v === 'pending' ? undefined : (v as 'rejected') },
              replace: true,
            })
          }
          data={[
            { value: 'pending', label: t('pending.tabPending') },
            { value: 'rejected', label: t('pending.tabRejected') },
          ]}
          style={{ alignSelf: 'flex-start' }}
        />
        <FormError error={list.error} />
        {list.isPending ? (
          <Loader />
        ) : (
          list.data &&
          (list.data.items.length === 0 ? (
            <Text c="dimmed">{status === 'pending' ? t('pending.empty') : t('pending.emptyRejected')}</Text>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                {t('pending.total', {
                  count: list.data.total,
                  amount: money(list.data.sum.amount, list.data.sum.currency),
                })}
              </Text>
              {list.data.items.map((m) => (
                <PendingRow
                  key={m.id}
                  m={m}
                  canResolve={canResolve}
                  onConfirm={() => setConfirming(m)}
                  onReject={() => setRejecting(m)}
                />
              ))}
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                total={list.data.total}
                onChange={(p) => void navigate({ search: (prev) => ({ ...prev, page: p }) })}
              />
            </>
          ))
        )}
      </Stack>
      <ConfirmPendingModal
        movement={confirming}
        onClose={() => setConfirming(null)}
        onDone={() => {
          setConfirming(null);
          notifications.show({ color: 'teal', message: t('pending.confirmed') });
          refresh();
        }}
      />
      <VoidModal
        opened={rejecting !== null}
        onClose={() => setRejecting(null)}
        labels={{
          title: t('pending.rejectTitle'),
          body: t('pending.rejectBody'),
          confirm: t('pending.reject'),
        }}
        onConfirm={async (reason) => {
          if (!rejecting) return;
          try {
            await financeApi.rejectPending(rejecting.id, reason);
            setRejecting(null);
            notifications.show({ message: t('pending.rejected') });
            refresh();
          } catch (err) {
            notifications.show({ color: 'red', message: errorMessage(err) });
          }
        }}
      />
    </>
  );
}
