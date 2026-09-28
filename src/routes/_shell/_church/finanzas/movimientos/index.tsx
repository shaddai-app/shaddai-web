import {
  Button,
  Card,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { financeApi } from '../../../../../api/finance';
import { requirePermission } from '../../../../../auth/guards';
import { FormError } from '../../../../../components/FormError';
import { PaginationBar } from '../../../../../components/PaginationBar';
import {
  accountsQuery,
  categoriesQuery,
  useCategoryLabel,
  useMoney,
} from '../../../../../features/finance/common';
import { MovementLine } from '../../../../../features/finance/MovementLine';
import { PageHeader } from '../../../../../layout/PageHeader';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const search = z.object({
  page: z.number().int().min(1).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  financeAccountId: z.number().int().optional(),
  categoryId: z.number().int().optional(),
  kind: z.enum(['income', 'expense', 'transfer']).optional(),
  voided: z.boolean().optional(),
  personId: z.number().int().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute('/_shell/_church/finanzas/movimientos/')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.ver'),
  component: MovementsPage,
});

const PAGE_SIZE = 30;

function MovementsPage() {
  const { t } = useTranslation(['finance', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const money = useMoney();
  const categoryLabel = useCategoryLabel();
  const accounts = useQuery(accountsQuery(true));
  const categories = useQuery(categoriesQuery(undefined, true));
  const [q, setQ] = useState(params.q ?? '');
  const page = params.page ?? 1;
  const query = {
    from: params.from,
    to: params.to,
    financeAccountId: params.financeAccountId,
    categoryId: params.categoryId,
    kind: params.kind,
    status: params.voided ? ('voided' as const) : undefined,
    personId: params.personId,
    q: params.q,
  };
  const list = useQuery({
    queryKey: ['finance', 'movements', { ...query, page }],
    queryFn: () => financeApi.movements({ ...query, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }), replace: true });
  const debouncedQ = useDebouncedCallback((v: string) => setSearch({ q: v || undefined }), 350);
  const filtered = Object.entries(params).some(([k, v]) => k !== 'page' && v !== undefined);
  const categoryOptions = (categories.data ?? [])
    .filter((c) => !params.kind || params.kind === 'transfer' || c.kind === params.kind)
    .map((c) => ({ value: String(c.id), label: categoryLabel(c), group: t(`kinds.${c.kind}`) }));
  const groupedCategories = Object.values(
    categoryOptions.reduce<Record<string, { group: string; items: { value: string; label: string }[] }>>(
      (acc, o) => {
        (acc[o.group] ??= { group: o.group, items: [] }).items.push({ value: o.value, label: o.label });
        return acc;
      },
      {},
    ),
  );

  return (
    <>
      <PageHeader title={t('movements.title')} description={t('movements.description')} />
      <Stack gap="md">
        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('movements.search')}
            aria-label={t('movements.search')}
            value={q}
            onChange={(e) => {
              setQ(e.currentTarget.value);
              debouncedQ(e.currentTarget.value);
            }}
            style={{ flex: '1 1 220px' }}
          />
          <TextInput
            type="date"
            aria-label={t('movements.from')}
            value={params.from ?? ''}
            max={params.to}
            onChange={(e) => setSearch({ from: e.currentTarget.value || undefined })}
            w={{ base: 'calc(50% - 6px)', xs: 150 }}
          />
          <TextInput
            type="date"
            aria-label={t('movements.to')}
            value={params.to ?? ''}
            min={params.from}
            onChange={(e) => setSearch({ to: e.currentTarget.value || undefined })}
            w={{ base: 'calc(50% - 6px)', xs: 150 }}
          />
        </Group>
        <Group gap="sm" wrap="wrap">
          <Select
            aria-label={t('movement.account')}
            placeholder={t('movements.allAccounts')}
            clearable
            data={(accounts.data ?? []).map((a) => ({
              value: String(a.id),
              label: `${a.name} (${a.currency})`,
            }))}
            value={params.financeAccountId ? String(params.financeAccountId) : null}
            onChange={(v) => setSearch({ financeAccountId: v ? Number(v) : undefined })}
            w={{ base: '100%', xs: 200 }}
          />
          <Select
            aria-label={t('movements.kind')}
            placeholder={t('movements.allKinds')}
            clearable
            data={(['income', 'expense', 'transfer'] as const).map((k) => ({
              value: k,
              label: t(`kinds.${k}`),
            }))}
            value={params.kind ?? null}
            onChange={(v) =>
              setSearch({
                kind: (v as 'income' | 'expense' | 'transfer' | null) ?? undefined,
                categoryId: undefined,
              })
            }
            w={{ base: '100%', xs: 170 }}
          />
          {params.kind !== 'transfer' && (
            <Select
              aria-label={t('movement.category')}
              placeholder={t('movements.allCategories')}
              clearable
              searchable
              data={groupedCategories}
              value={params.categoryId ? String(params.categoryId) : null}
              onChange={(v) => setSearch({ categoryId: v ? Number(v) : undefined })}
              w={{ base: '100%', xs: 210 }}
            />
          )}
          <Switch
            label={t('movements.voided')}
            checked={Boolean(params.voided)}
            onChange={(e) => setSearch({ voided: e.currentTarget.checked || undefined })}
          />
        </Group>

        <FormError error={list.error} />
        {list.isPending ? (
          <Loader />
        ) : (
          list.data && (
            <>
              {list.data.totals.length > 0 && !params.voided && (
                <SimpleGrid cols={{ base: 1, sm: list.data.totals.length > 1 ? 2 : 1 }} spacing="sm">
                  {list.data.totals.map((row) => (
                    <Card key={row.currency} withBorder radius="lg" padding="sm">
                      <SimpleGrid cols={3} spacing="xs">
                        {(['income', 'expense', 'net'] as const).map((k) => (
                          <div key={k}>
                            <Text size="xs" c="dimmed">
                              {t(`summary.${k}`)} ({row.currency})
                            </Text>
                            <Text
                              size="sm"
                              fw={600}
                              c={k === 'income' ? 'teal' : k === 'expense' ? 'red' : undefined}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {money(row[k], row.currency)}
                            </Text>
                          </div>
                        ))}
                      </SimpleGrid>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
              {list.data.items.length === 0 ? (
                <Stack align="flex-start" gap="xs">
                  <Text c="dimmed">{filtered ? t('movements.emptyFiltered') : t('summary.noMovements')}</Text>
                  {filtered && (
                    <Button
                      variant="subtle"
                      onClick={() => {
                        setQ('');
                        void navigate({ search: {}, replace: true });
                      }}
                    >
                      {t('movements.clearFilters')}
                    </Button>
                  )}
                </Stack>
              ) : (
                <>
                  <Text size="sm" c="dimmed">
                    {t('movements.total', { count: list.data.total })}
                  </Text>
                  <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
                    {/* La primera fila no lleva borde superior. */}
                    <div style={{ marginTop: -1 }}>
                      {list.data.items.map((m) => (
                        <MovementLine key={m.id} m={m} showAccount={!params.financeAccountId} />
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
              )}
            </>
          )
        )}
      </Stack>
    </>
  );
}
