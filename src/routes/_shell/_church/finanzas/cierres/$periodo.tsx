import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconLock, IconLockOpen } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { financeApi, type PeriodBalance, type PeriodDetail } from '../../../../../api/finance';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink } from '../../../../../components/links';
import { ResponsiveModal } from '../../../../../components/ResponsiveModal';
import { monthLabel, useMoney } from '../../../../../features/finance/common';
import { VoidModal } from '../../../../../features/finance/MovementModals';
import { fullName } from '../../../../../features/people/format';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/finanzas/cierres/$periodo')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver', 'finanzas.cierre'),
  component: PeriodPage,
});

const tabular = { fontVariantNumeric: 'tabular-nums' } as const;

/** "2026-08" → { year: 2026, month: 8 } (null si no es un mes válido). */
function parsePeriod(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year: Number(match[1]), month } : null;
}

function Line({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="sm" c={strong ? undefined : 'dimmed'} fw={strong ? 600 : undefined}>
        {label}
      </Text>
      <Text size="sm" fw={strong ? 700 : 500} style={tabular}>
        {children}
      </Text>
    </Group>
  );
}

function BalanceCard({ b }: { b: PeriodBalance }) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const m = (v: number, signed = false) => money(v, b.financeAccount.currency, { signed });
  return (
    <Card withBorder radius="lg">
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Text fw={600} truncate>
          {b.financeAccount.name}
        </Text>
        <Text size="xs" c="dimmed">
          {b.financeAccount.currency}
        </Text>
      </Group>
      <Stack gap={4}>
        <Line label={t('periods.opening')}>{m(b.opening)}</Line>
        <Line label={t('summary.income')}>{m(b.income, true)}</Line>
        <Line label={t('summary.expense')}>{m(-b.expense, true)}</Line>
        {(b.transfersIn > 0 || b.transfersOut > 0) && (
          <Line label={t('periods.transfers')}>{m(b.transfersIn - b.transfersOut, true)}</Line>
        )}
        <Line label={t('periods.closing')} strong>
          {m(b.closing)}
        </Line>
      </Stack>
    </Card>
  );
}

function CloseModal({
  period,
  opened,
  onClose,
  onDone,
}: {
  period: PeriodDetail;
  opened: boolean;
  onClose: () => void;
  onDone: (p: PeriodDetail) => void;
}) {
  const { t } = useTranslation(['finance', 'common']);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { pending, drafts } = period.unresolved;
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={t('periods.closeTitle', { month: monthLabel(period.year, period.month) })}
      size="md"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            onDone(await financeApi.closePeriod(period.year, period.month, notes.trim() || null));
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Stack>
          <FormError error={error} />
          <Text size="sm">{t('periods.closeBody')}</Text>
          {(pending > 0 || drafts > 0) && (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
              {t('periods.unresolved', { pending, drafts })}
            </Alert>
          )}
          <Textarea
            label={t('periods.notes')}
            placeholder={t('periods.notesHint')}
            data-autofocus
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            maxLength={500}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" color="teal" leftSection={<IconLock size={16} />} loading={busy}>
              {t('periods.close')}
            </Button>
          </Group>
        </Stack>
      </form>
    </ResponsiveModal>
  );
}

function PeriodPage() {
  const { t } = useTranslation(['finance', 'common']);
  const ym = parsePeriod(Route.useParams().periodo);
  const queryClient = useQueryClient();
  const money = useMoney();
  const { data: me } = useSuspenseQuery(meQuery());
  const key = ['finance', 'period', ym?.year, ym?.month];
  const query = useQuery({
    queryKey: key,
    queryFn: () => financeApi.period(ym!.year, ym!.month),
    enabled: ym !== null,
  });
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);

  if (!ym) return <Text c="dimmed">{t('common:notFound')}</Text>;
  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const p = query.data;
  const closed = p.status === 'closed';
  const update = (next: PeriodDetail) => {
    queryClient.setQueryData(key, next);
    void queryClient.invalidateQueries({
      queryKey: ['finance'],
      predicate: (q) => q.queryKey[1] !== 'period',
    });
  };

  return (
    <>
      <PageHeader
        back={{ to: '/finanzas/cierres' }}
        title={monthLabel(p.year, p.month)}
        badge={
          <Badge color={closed ? 'teal' : 'gray'} variant="light">
            {t(`periods.status.${p.status}`)}
          </Badge>
        }
        actions={
          <Group gap="xs">
            {p.canClose && can(me, 'finanzas.cierre') && (
              <Button color="teal" leftSection={<IconLock size={18} />} onClick={() => setClosing(true)}>
                {t('periods.close')}
              </Button>
            )}
            {p.canReopen && can(me, 'finanzas.reabrir_cierre') && (
              <Button
                variant="default"
                leftSection={<IconLockOpen size={18} />}
                onClick={() => setReopening(true)}
              >
                {t('periods.reopen')}
              </Button>
            )}
          </Group>
        }
      />
      <Stack gap="md">
        {closed ? (
          <Alert color="teal" variant="light" icon={<IconLock size={18} />}>
            {t('periods.closedOn', {
              date: p.closedAt ? dayjs(p.closedAt).format('L LT') : '—',
              name: p.closedBy ? fullName(p.closedBy) : '—',
            })}
            {p.notes && (
              <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
                {p.notes}
              </Text>
            )}
          </Alert>
        ) : (
          <Text size="sm" c="dimmed">
            {p.canClose
              ? t('periods.readyHint')
              : p.to >= dayjs().format('YYYY-MM-DD')
                ? t('periods.notEndedHint')
                : t('periods.previousOpenHint')}
          </Text>
        )}
        {p.reopenedAt && (
          <Alert color="gray" variant="light" title={t('periods.reopenedTitle')}>
            {t('periods.reopenedBy', {
              date: dayjs(p.reopenedAt).format('L LT'),
              name: p.reopenedBy ? fullName(p.reopenedBy) : '—',
            })}
            <Text size="sm" mt={4}>
              {p.reopenReason}
            </Text>
          </Alert>
        )}
        {!closed && (p.unresolved.pending > 0 || p.unresolved.drafts > 0) && (
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
            {t('periods.unresolved', { pending: p.unresolved.pending, drafts: p.unresolved.drafts })}
          </Alert>
        )}

        {p.totals.map((row) => (
          <Card key={row.currency} withBorder radius="lg">
            <Title order={3} size="h5" mb="sm">
              {t('periods.totals', { currency: row.currency })}
            </Title>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              {(['opening', 'income', 'expense', 'closing'] as const).map((k) => (
                <div key={k}>
                  <Text size="xs" c="dimmed">
                    {k === 'income' || k === 'expense' ? t(`summary.${k}`) : t(`periods.${k}`)}
                  </Text>
                  <Text
                    fw={k === 'closing' ? 700 : 600}
                    c={k === 'income' ? 'teal' : k === 'expense' ? 'red' : undefined}
                    style={tabular}
                  >
                    {money(row[k], row.currency)}
                  </Text>
                </div>
              ))}
            </SimpleGrid>
          </Card>
        ))}

        <Group justify="space-between">
          <Title order={3} size="h5">
            {t('periods.byAccount')}
          </Title>
          <AnchorLink to="/finanzas/movimientos" search={{ from: p.from, to: p.to }} size="sm">
            {t('periods.seeMovements')}
          </AnchorLink>
        </Group>
        {p.balances.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('periods.noAccounts')}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {p.balances.map((b) => (
              <BalanceCard key={b.financeAccount.id} b={b} />
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <CloseModal
        period={p}
        opened={closing}
        onClose={() => setClosing(false)}
        onDone={(next) => {
          setClosing(false);
          update(next);
          notifications.show({ color: 'teal', message: t('periods.closed') });
        }}
      />
      <VoidModal
        opened={reopening}
        onClose={() => setReopening(false)}
        labels={{
          title: t('periods.reopenTitle'),
          body: t('periods.reopenBody'),
          confirm: t('periods.reopen'),
        }}
        onConfirm={async (reason) => {
          try {
            update(await financeApi.reopenPeriod(p.year, p.month, reason));
            setReopening(false);
            notifications.show({ message: t('periods.reopened') });
          } catch (err) {
            notifications.show({ color: 'red', message: errorMessage(err) });
          }
        }}
      />
    </>
  );
}
