import {
  Button,
  Card,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ACCOUNT_STATUSES, platformApi, type AccountListItem } from '../../../../api/platform';
import { FormError } from '../../../../components/FormError';
import { PaginationBar } from '../../../../components/PaginationBar';
import { StatusBadge } from '../../../../features/platform/StatusBadge';
import { PageHeader } from '../../../../layout/PageHeader';

const search = z.object({
  page: z.number().int().min(1).optional(),
  q: z.string().optional(),
  status: z.enum(['trial', 'active', 'past_due', 'suspended', 'closed']).optional(),
});

export const Route = createFileRoute('/_shell/_platform/plataforma/')({
  validateSearch: search,
  component: PlatformHome,
});

const PAGE_SIZE = 20;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fz={28} fw={700} mt={4}>
        {value}
      </Text>
    </Card>
  );
}

function Stats() {
  const { t } = useTranslation('platform');
  const stats = useQuery({ queryKey: ['platform', 'stats'], queryFn: platformApi.stats });
  if (!stats.data) return null;
  const s = stats.data.accountsByStatus;
  return (
    <SimpleGrid cols={{ base: 2, md: 5 }} mb="lg">
      <Stat label={t('stats.active')} value={s.active ?? 0} />
      <Stat label={t('stats.trial')} value={s.trial ?? 0} />
      <Stat label={t('stats.pastDue')} value={(s.past_due ?? 0) + (s.suspended ?? 0)} />
      <Stat label={t('stats.users')} value={stats.data.activeUsers} />
      <Stat label={t('stats.new')} value={stats.data.newAccountsLast30Days} />
    </SimpleGrid>
  );
}

function PlatformHome() {
  const { t } = useTranslation('platform');
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(params.q ?? '');
  const page = params.page ?? 1;

  const list = useQuery({
    queryKey: ['platform', 'accounts', { ...params, page }],
    queryFn: () => platformApi.accounts({ ...params, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });
  const debouncedQ = useDebouncedCallback((v: string) => setSearch({ q: v || undefined }), 350);

  const open = (a: AccountListItem) =>
    void navigate({ to: '/plataforma/cuentas/$id', params: { id: String(a.id) } });

  const trial = (a: AccountListItem) =>
    a.status === 'trial' && a.trialEndsAt
      ? t('accounts.trialUntil', { date: dayjs(a.trialEndsAt).format('L') })
      : null;

  return (
    <>
      <PageHeader
        title={t('accounts.title')}
        description={t('accounts.description')}
        actions={
          <Button component={Link} to="/plataforma/cuentas/nueva" leftSection={<IconPlus size={18} />}>
            {t('accounts.add')}
          </Button>
        }
      />
      <Stats />
      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder={t('accounts.search')}
          aria-label={t('accounts.search')}
          value={q}
          onChange={(e) => {
            setQ(e.currentTarget.value);
            debouncedQ(e.currentTarget.value);
          }}
          style={{ flex: '1 1 240px' }}
        />
        <Select
          aria-label={t('accounts.allStatuses')}
          placeholder={t('accounts.allStatuses')}
          clearable
          data={ACCOUNT_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
          value={params.status ?? null}
          onChange={(v) => setSearch({ status: (v as z.infer<typeof search>['status']) ?? undefined })}
          w={{ base: '100%', xs: 220 }}
        />
      </Group>

      <FormError error={list.error} />
      {list.isPending ? (
        <Loader />
      ) : list.data && list.data.items.length === 0 ? (
        <Text c="dimmed">{t('accounts.empty')}</Text>
      ) : (
        list.data && (
          <>
            <Card withBorder radius="lg" p={0} visibleFrom="sm">
              <Table.ScrollContainer minWidth={720}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('accounts.columns.name')}</Table.Th>
                      <Table.Th>{t('accounts.columns.plan')}</Table.Th>
                      <Table.Th>{t('accounts.columns.status')}</Table.Th>
                      <Table.Th>{t('accounts.columns.users')}</Table.Th>
                      <Table.Th>{t('accounts.columns.created')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {list.data.items.map((a) => (
                      <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => open(a)}>
                        <Table.Td>
                          <Link
                            to="/plataforma/cuentas/$id"
                            params={{ id: String(a.id) }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            <Text size="sm" fw={500}>
                              {a.name}
                            </Text>
                          </Link>
                          <Text size="xs" c="dimmed">
                            {a.slug}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{a.plan.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <StatusBadge status={a.status} />
                            {trial(a) && (
                              <Text size="xs" c="dimmed">
                                {trial(a)}
                              </Text>
                            )}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c={a.activeUsers >= a.userLimit ? 'orange' : undefined}>
                            {a.activeUsers} / {a.userLimit}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{dayjs(a.createdAt).format('L')}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>

            <Stack gap="sm" hiddenFrom="sm">
              {list.data.items.map((a) => (
                <UnstyledButton key={a.id} onClick={() => open(a)}>
                  <Card withBorder radius="lg" padding="md">
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <div style={{ minWidth: 0 }}>
                        <Text fw={500} truncate>
                          {a.name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {a.plan.name} · {a.activeUsers}/{a.userLimit}
                        </Text>
                      </div>
                      <StatusBadge status={a.status} />
                    </Group>
                  </Card>
                </UnstyledButton>
              ))}
            </Stack>

            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={list.data.total}
              onChange={(p) => void navigate({ search: (prev) => ({ ...prev, page: p }) })}
            />
          </>
        )
      )}
    </>
  );
}
