import { Button, Card, Group, Loader, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowsExchange, IconMinus, IconPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { financeApi, type CategoryKind } from '../../../../api/finance';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink, UnstyledLink } from '../../../../components/links';
import { ACCOUNT_ICONS, useMoney } from '../../../../features/finance/common';
import { MovementLine } from '../../../../features/finance/MovementLine';
import { MovementModal, TransferModal } from '../../../../features/finance/MovementModals';
import { formatDate } from '../../../../features/people/format';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/finanzas/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver'),
  component: FinancePage,
});

function FinancePage() {
  const { t } = useTranslation(['finance', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const money = useMoney();
  const { data: me } = useSuspenseQuery(meQuery());
  const summary = useQuery({ queryKey: ['finance', 'summary'], queryFn: financeApi.summary });
  const [creating, setCreating] = useState<CategoryKind | null>(null);
  const [transferring, setTransferring] = useState(false);
  const canRegister = can(me, 'finanzas.registrar');
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['finance'] });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          canRegister && (
            <Group gap="xs">
              <Button color="teal" leftSection={<IconPlus size={18} />} onClick={() => setCreating('income')}>
                {t('kinds.income')}
              </Button>
              <Button
                color="red"
                leftSection={<IconMinus size={18} />}
                onClick={() => setCreating('expense')}
              >
                {t('kinds.expense')}
              </Button>
              <Button
                variant="default"
                leftSection={<IconArrowsExchange size={18} />}
                onClick={() => setTransferring(true)}
              >
                {t('transfer.short')}
              </Button>
            </Group>
          )
        }
      />
      <FormError error={summary.error} />
      {summary.isPending ? (
        <Loader />
      ) : (
        summary.data && (
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
              {summary.data.accounts.map((a) => {
                const AccountIcon = ACCOUNT_ICONS[a.type];
                return (
                  <UnstyledLink key={a.id} to="/finanzas/movimientos" search={{ financeAccountId: a.id }}>
                    <Card withBorder radius="lg" padding="md">
                      <Group justify="space-between" wrap="nowrap" mb={6}>
                        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                          <ThemeIcon variant="light" radius="md">
                            <AccountIcon size={18} />
                          </ThemeIcon>
                          <Text fw={500} truncate>
                            {a.name}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {a.currency}
                        </Text>
                      </Group>
                      <Text
                        fw={700}
                        size="xl"
                        c={a.balance < 0 ? 'red' : undefined}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {money(a.balance, a.currency)}
                      </Text>
                    </Card>
                  </UnstyledLink>
                );
              })}
            </SimpleGrid>

            <Card withBorder radius="lg">
              <Title order={3} size="h5" mb="sm">
                {t('summary.month', {
                  from: formatDate(summary.data.month.from),
                  to: formatDate(summary.data.month.to),
                })}
              </Title>
              {summary.data.month.totals.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t('summary.noMovements')}
                </Text>
              ) : (
                <Stack gap="sm">
                  {summary.data.month.totals.map((row) => (
                    <SimpleGrid key={row.currency} cols={3} spacing="sm">
                      {(['income', 'expense', 'net'] as const).map((k) => (
                        <div key={k}>
                          <Text size="xs" c="dimmed">
                            {t(`summary.${k}`)} ({row.currency})
                          </Text>
                          <Text
                            fw={600}
                            c={
                              k === 'income'
                                ? 'teal'
                                : k === 'expense'
                                  ? 'red'
                                  : row.net < 0
                                    ? 'red'
                                    : undefined
                            }
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {money(row[k], row.currency)}
                          </Text>
                        </div>
                      ))}
                    </SimpleGrid>
                  ))}
                </Stack>
              )}
            </Card>

            <Card withBorder radius="lg" p={0}>
              <Group justify="space-between" p="md" pb="sm">
                <Title order={3} size="h5">
                  {t('summary.recent')}
                </Title>
                <AnchorLink to="/finanzas/movimientos" size="sm">
                  {t('summary.all')}
                </AnchorLink>
              </Group>
              {summary.data.recent.length === 0 ? (
                <Text size="sm" c="dimmed" px="md" pb="md">
                  {t('summary.noMovements')}
                </Text>
              ) : (
                summary.data.recent.map((m) => <MovementLine key={m.id} m={m} />)
              )}
            </Card>
          </Stack>
        )
      )}
      <MovementModal
        opened={creating !== null}
        kind={creating ?? 'income'}
        onClose={() => setCreating(null)}
        onSaved={(m) => {
          setCreating(null);
          notifications.show({
            color: 'teal',
            message: t('movement.saved'),
          });
          refresh();
          void navigate({ to: '/finanzas/movimientos/$id', params: { id: String(m.id) } });
        }}
      />
      <TransferModal
        opened={transferring}
        onClose={() => setTransferring(false)}
        onSaved={() => {
          setTransferring(false);
          notifications.show({ color: 'teal', message: t('transfer.saved') });
          refresh();
        }}
      />
    </>
  );
}
