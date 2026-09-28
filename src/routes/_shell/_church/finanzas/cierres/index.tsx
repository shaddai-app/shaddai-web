import { Badge, Card, Group, Loader, Stack, Text } from '@mantine/core';
import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { requirePermission } from '../../../../../auth/guards';
import { FormError } from '../../../../../components/FormError';
import { UnstyledLink } from '../../../../../components/links';
import { monthLabel, periodsQuery } from '../../../../../features/finance/common';
import { fullName } from '../../../../../features/people/format';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/finanzas/cierres/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver', 'finanzas.cierre'),
  component: PeriodsPage,
});

const periodParam = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

function PeriodsPage() {
  const { t } = useTranslation(['finance', 'common']);
  const list = useQuery(periodsQuery());

  return (
    <>
      <PageHeader title={t('periods.title')} description={t('periods.description')} />
      <Stack gap="md" maw={820}>
        <FormError error={list.error} />
        {list.isPending ? (
          <Loader />
        ) : (
          list.data &&
          (list.data.items.length === 0 ? (
            <Text c="dimmed">{t('periods.empty')}</Text>
          ) : (
            <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: -1 }}>
                {list.data.items.map((p) => {
                  const closed = p.status === 'closed';
                  return (
                    <UnstyledLink
                      key={`${p.year}-${p.month}`}
                      to="/finanzas/cierres/$periodo"
                      params={{ periodo: periodParam(p.year, p.month) }}
                      px="md"
                      py="sm"
                      style={{ display: 'block', borderTop: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <Group justify="space-between" wrap="nowrap" gap="sm">
                        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                          {closed ? (
                            <IconLock size={18} color="var(--mantine-color-teal-6)" />
                          ) : (
                            <IconLockOpen size={18} color="var(--mantine-color-dimmed)" />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <Text size="sm" fw={500}>
                              {monthLabel(p.year, p.month)}
                            </Text>
                            <Text size="xs" c="dimmed" truncate>
                              {closed && p.closedAt
                                ? t('periods.closedOn', {
                                    date: dayjs(p.closedAt).format('L'),
                                    name: p.closedBy ? fullName(p.closedBy) : '—',
                                  })
                                : p.reopenedAt
                                  ? t('periods.reopenedOn', { date: dayjs(p.reopenedAt).format('L') })
                                  : t('periods.openHint')}
                            </Text>
                          </div>
                        </Group>
                        {closed ? (
                          <Badge size="sm" color="teal" variant="light">
                            {t('periods.status.closed')}
                          </Badge>
                        ) : p.canClose ? (
                          <Badge size="sm" color="yellow" variant="light">
                            {t('periods.toClose')}
                          </Badge>
                        ) : (
                          <Badge size="sm" color="gray" variant="light">
                            {t('periods.status.open')}
                          </Badge>
                        )}
                      </Group>
                    </UnstyledLink>
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </Stack>
    </>
  );
}
