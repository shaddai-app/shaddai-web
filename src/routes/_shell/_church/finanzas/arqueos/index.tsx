import { Badge, Button, Card, Group, Loader, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { financeApi, type CountStatus } from '../../../../../api/finance';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { UnstyledLink } from '../../../../../components/links';
import { PaginationBar } from '../../../../../components/PaginationBar';
import { COUNT_STATUS_COLORS, useMoney } from '../../../../../features/finance/common';
import { CountHeaderModal } from '../../../../../features/finance/CountHeaderModal';
import { formatDate, fullName } from '../../../../../features/people/format';
import { PageHeader } from '../../../../../layout/PageHeader';

const search = z.object({
  page: z.number().int().min(1).optional(),
  status: z.enum(['draft', 'confirmed', 'voided']).optional(),
});

export const Route = createFileRoute('/_shell/_church/finanzas/arqueos/')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver', 'finanzas.arqueo'),
  component: CountsPage,
});

const PAGE_SIZE = 30;

function CountsPage() {
  const { t } = useTranslation(['finance', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const money = useMoney();
  const { data: me } = useSuspenseQuery(meQuery());
  const page = params.page ?? 1;
  const list = useQuery({
    queryKey: ['finance', 'counts', { status: params.status, page }],
    queryFn: () => financeApi.counts({ status: params.status, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title={t('counts.title')}
        description={t('counts.description')}
        actions={
          can(me, 'finanzas.arqueo') && (
            <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>
              {t('counts.new')}
            </Button>
          )
        }
      />
      <Stack gap="md">
        <SegmentedControl
          value={params.status ?? 'all'}
          onChange={(v) =>
            void navigate({
              search: { status: v === 'all' ? undefined : (v as CountStatus) },
              replace: true,
            })
          }
          data={[
            { value: 'all', label: t('counts.all') },
            { value: 'draft', label: t('counts.status.draft') },
            { value: 'confirmed', label: t('counts.status.confirmed') },
            { value: 'voided', label: t('counts.status.voided') },
          ]}
          style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
        />
        <FormError error={list.error} />
        {list.isPending ? (
          <Loader />
        ) : (
          list.data &&
          (list.data.items.length === 0 ? (
            <Text c="dimmed">{t('counts.empty')}</Text>
          ) : (
            <>
              <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: -1 }}>
                  {list.data.items.map((c) => (
                    <UnstyledLink
                      key={c.id}
                      to="/finanzas/arqueos/$id"
                      params={{ id: String(c.id) }}
                      px="md"
                      py="sm"
                      style={{ display: 'block', borderTop: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <Group justify="space-between" wrap="nowrap" gap="sm">
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate>
                            {c.title ?? t('counts.untitled', { date: formatDate(c.date) })}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {[
                              formatDate(c.date),
                              c.financeAccount.name,
                              `${fullName(c.counter1)} · ${fullName(c.counter2)}`,
                            ].join(' · ')}
                          </Text>
                        </div>
                        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                          {c.status !== 'confirmed' && (
                            <Badge size="xs" color={COUNT_STATUS_COLORS[c.status]} variant="light">
                              {t(`counts.status.${c.status}`)}
                            </Badge>
                          )}
                          <Text
                            size="sm"
                            fw={600}
                            c={c.status === 'voided' ? 'dimmed' : undefined}
                            td={c.status === 'voided' ? 'line-through' : undefined}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {money(c.total, c.financeAccount.currency)}
                          </Text>
                        </Group>
                      </Group>
                    </UnstyledLink>
                  ))}
                </div>
              </Card>
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
      <CountHeaderModal
        opened={creating}
        onClose={() => setCreating(false)}
        onSaved={(c) => {
          setCreating(false);
          void navigate({ to: '/finanzas/arqueos/$id', params: { id: String(c.id) } });
        }}
      />
    </>
  );
}
