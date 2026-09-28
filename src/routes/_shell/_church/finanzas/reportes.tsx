import {
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconFileSpreadsheet, IconFileTypePdf } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { reportsApi, type ReportFormat, type ReportType } from '../../../../api/finance';
import { requirePermission } from '../../../../auth/guards';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { accountsQuery, monthName, useCategoryLabel, useMoney } from '../../../../features/finance/common';
import { useDownload } from '../../../../features/finance/download';
import { fullName, todayIso } from '../../../../features/people/format';
import { PageHeader } from '../../../../layout/PageHeader';

const TABS = ['income-statement', 'balances', 'tithes-trend', 'contributions'] as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const search = z.object({
  tab: z.enum(TABS).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  financeAccountId: z.number().int().optional(),
  asOf: isoDate.optional(),
  year: z.number().int().optional(),
});
type Search = z.infer<typeof search>;

export const Route = createFileRoute('/_shell/_church/finanzas/reportes')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'finanzas.reportes'),
  component: ReportsPage,
});

const tabular = { fontVariantNumeric: 'tabular-nums' } as const;
const thisYear = () => Number(todayIso().slice(0, 4));

/** Botones de descarga en PDF y Excel del reporte con los filtros actuales. */
function Downloads({
  type,
  query,
  fileSuffix,
}: {
  type: ReportType;
  query: Record<string, string | number | undefined>;
  fileSuffix: string;
}) {
  const { t } = useTranslation('finance');
  const { busy, run } = useDownload();
  const get = (format: ReportFormat) =>
    run(
      format,
      (lang) => reportsApi.download(type, format, lang, query),
      `${t(`reports.files.${type}`)}-${fileSuffix}.${format}`,
    );
  return (
    <Group gap="xs">
      <Button
        variant="default"
        leftSection={<IconFileTypePdf size={16} />}
        loading={busy === 'pdf'}
        onClick={() => void get('pdf')}
      >
        PDF
      </Button>
      <Button
        variant="default"
        leftSection={<IconFileSpreadsheet size={16} />}
        loading={busy === 'xlsx'}
        onClick={() => void get('xlsx')}
      >
        Excel
      </Button>
    </Group>
  );
}

function Filters({ children, downloads }: { children: ReactNode; downloads: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" gap="sm" wrap="wrap">
      <Group gap="sm" align="flex-end" wrap="wrap">
        {children}
      </Group>
      {downloads}
    </Group>
  );
}

function YearSelect({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const { t } = useTranslation('finance');
  const years = Array.from({ length: 6 }, (_, i) => thisYear() - i);
  return (
    <Select
      label={t('reports.year')}
      data={years.map((y) => String(y))}
      value={String(value)}
      onChange={(v) => v && onChange(Number(v))}
      allowDeselect={false}
      w={110}
    />
  );
}

function Amount({
  value,
  currency,
  strong,
  color,
}: {
  value: number;
  currency: string;
  strong?: boolean;
  color?: string;
}) {
  const money = useMoney();
  return (
    <Text size="sm" fw={strong ? 700 : 500} c={color} ta="right" style={tabular}>
      {money(value, currency)}
    </Text>
  );
}

function IncomeStatementTab({ params, set }: { params: Search; set: (p: Partial<Search>) => void }) {
  const { t } = useTranslation('finance');
  const categoryLabel = useCategoryLabel();
  const accounts = useQuery(accountsQuery(true));
  const from = params.from ?? `${thisYear()}-01-01`;
  const to = params.to ?? todayIso();
  const q = { from, to, financeAccountId: params.financeAccountId };
  const data = useQuery({
    queryKey: ['finance', 'reports', 'income-statement', q],
    queryFn: () => reportsApi.incomeStatement(q),
    placeholderData: keepPreviousData,
  });
  return (
    <Stack gap="md">
      <Filters downloads={<Downloads type="income-statement" query={q} fileSuffix={`${from}-${to}`} />}>
        <TextInput
          type="date"
          label={t('movements.from')}
          value={from}
          max={to}
          onChange={(e) => e.currentTarget.value && set({ from: e.currentTarget.value })}
          w={160}
        />
        <TextInput
          type="date"
          label={t('movements.to')}
          value={to}
          min={from}
          onChange={(e) => e.currentTarget.value && set({ to: e.currentTarget.value })}
          w={160}
        />
        <Select
          label={t('movement.account')}
          placeholder={t('movements.allAccounts')}
          clearable
          data={(accounts.data ?? []).map((a) => ({
            value: String(a.id),
            label: `${a.name} (${a.currency})`,
          }))}
          value={params.financeAccountId ? String(params.financeAccountId) : null}
          onChange={(v) => set({ financeAccountId: v ? Number(v) : undefined })}
          w={{ base: '100%', xs: 220 }}
        />
      </Filters>
      <FormError error={data.error} />
      {data.isPending ? (
        <Loader />
      ) : data.data && data.data.currencies.length === 0 ? (
        <Text c="dimmed">{t('reports.empty')}</Text>
      ) : (
        data.data?.currencies.map((c) => (
          <Card key={c.currency} withBorder radius="lg">
            <Title order={3} size="h5" mb="sm">
              {t('reports.inCurrency', { currency: c.currency })}
            </Title>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {(['income', 'expense'] as const).map((kind) => (
                <Stack key={kind} gap={4}>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    {t(`summary.${kind}`)}
                  </Text>
                  {c[kind].map((line) => (
                    <Group key={line.category.id} justify="space-between" wrap="nowrap" gap="sm">
                      <Text size="sm" truncate>
                        {categoryLabel(line.category)}
                      </Text>
                      <Amount value={line.amount} currency={c.currency} />
                    </Group>
                  ))}
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    pt={4}
                    style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                  >
                    <Text size="sm" fw={600}>
                      {t('reports.total')}
                    </Text>
                    <Amount
                      value={kind === 'income' ? c.totalIncome : c.totalExpense}
                      currency={c.currency}
                      strong
                      color={kind === 'income' ? 'teal' : 'red'}
                    />
                  </Group>
                </Stack>
              ))}
            </SimpleGrid>
            <Group justify="space-between" mt="md">
              <Text fw={700}>{t('summary.net')}</Text>
              <Amount value={c.net} currency={c.currency} strong color={c.net < 0 ? 'red' : undefined} />
            </Group>
          </Card>
        ))
      )}
    </Stack>
  );
}

function BalancesTab({ params, set }: { params: Search; set: (p: Partial<Search>) => void }) {
  const { t } = useTranslation('finance');
  const asOf = params.asOf ?? todayIso();
  const data = useQuery({
    queryKey: ['finance', 'reports', 'balances', asOf],
    queryFn: () => reportsApi.balances({ asOf }),
    placeholderData: keepPreviousData,
  });
  return (
    <Stack gap="md">
      <Filters downloads={<Downloads type="balances" query={{ asOf }} fileSuffix={asOf} />}>
        <TextInput
          type="date"
          label={t('reports.asOf')}
          value={asOf}
          max={todayIso()}
          onChange={(e) => e.currentTarget.value && set({ asOf: e.currentTarget.value })}
          w={160}
        />
      </Filters>
      <FormError error={data.error} />
      {data.isPending ? (
        <Loader />
      ) : (
        data.data && (
          <Card withBorder radius="lg" p={0}>
            {data.data.items.map((a) => (
              <Group
                key={a.id}
                justify="space-between"
                wrap="nowrap"
                px="md"
                py="sm"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <div style={{ minWidth: 0 }}>
                  <AnchorLink
                    to="/finanzas/movimientos"
                    search={{ financeAccountId: a.id, to: asOf }}
                    size="sm"
                    fw={500}
                  >
                    {a.name}
                  </AnchorLink>
                  <Text size="xs" c="dimmed">
                    {t(`accounts.types.${a.type}`)} · {a.currency}
                    {!a.isActive && ` · ${t('reports.inactive')}`}
                  </Text>
                </div>
                <Amount value={a.balance} currency={a.currency} color={a.balance < 0 ? 'red' : undefined} />
              </Group>
            ))}
            {data.data.totals.map((tot) => (
              <Group key={tot.currency} justify="space-between" px="md" py="sm">
                <Text size="sm" fw={700}>
                  {t('reports.total')} {tot.currency}
                </Text>
                <Amount value={tot.balance} currency={tot.currency} strong />
              </Group>
            ))}
          </Card>
        )
      )}
    </Stack>
  );
}

const TREND_KEYS = ['tithe', 'offering', 'otherIncome', 'expense', 'net'] as const;

function TrendTab({ params, set }: { params: Search; set: (p: Partial<Search>) => void }) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const year = params.year ?? thisYear();
  const data = useQuery({
    queryKey: ['finance', 'reports', 'trend', year],
    queryFn: () => reportsApi.trend({ year }),
    placeholderData: keepPreviousData,
  });
  return (
    <Stack gap="md">
      <Filters downloads={<Downloads type="tithes-trend" query={{ year }} fileSuffix={String(year)} />}>
        <YearSelect value={year} onChange={(y) => set({ year: y })} />
      </Filters>
      <FormError error={data.error} />
      {data.isPending ? (
        <Loader />
      ) : data.data && data.data.currencies.length === 0 ? (
        <Text c="dimmed">{t('reports.empty')}</Text>
      ) : (
        data.data?.currencies.map((c) => (
          <Card key={c.currency} withBorder radius="lg" p={0}>
            <Title order={3} size="h5" p="md" pb="xs">
              {t('reports.inCurrency', { currency: c.currency })}
            </Title>
            <ScrollArea type="auto">
              <Table striped highlightOnHover miw={640} style={tabular}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('reports.month')}</Table.Th>
                    {TREND_KEYS.map((k) => (
                      <Table.Th key={k} ta="right">
                        {t(`reports.trend.${k}`)}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {c.months.map((m) => (
                    <Table.Tr key={m.month}>
                      <Table.Td>{monthName(m.month)}</Table.Td>
                      {TREND_KEYS.map((k) => (
                        <Table.Td key={k} ta="right" c={k === 'net' && m.net < 0 ? 'red' : undefined}>
                          {money(m[k], c.currency)}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                  <Table.Tr fw={700}>
                    <Table.Td>{t('reports.total')}</Table.Td>
                    {TREND_KEYS.map((k) => (
                      <Table.Td key={k} ta="right">
                        {money(c.totals[k], c.currency)}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        ))
      )}
    </Stack>
  );
}

function ContributionsTab({ params, set }: { params: Search; set: (p: Partial<Search>) => void }) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const year = params.year ?? thisYear();
  const data = useQuery({
    queryKey: ['finance', 'reports', 'contributions', year],
    queryFn: () => reportsApi.contributions({ year }),
    placeholderData: keepPreviousData,
  });
  return (
    <Stack gap="md">
      <Filters downloads={<Downloads type="contributions" query={{ year }} fileSuffix={String(year)} />}>
        <YearSelect value={year} onChange={(y) => set({ year: y })} />
      </Filters>
      <Text size="xs" c="dimmed">
        {t('reports.contributionsHint')}
      </Text>
      <FormError error={data.error} />
      {data.isPending ? (
        <Loader />
      ) : data.data && data.data.items.length === 0 ? (
        <Text c="dimmed">{t('reports.empty')}</Text>
      ) : (
        data.data && (
          <>
            <Text size="sm" c="dimmed">
              {t('reports.people', { count: data.data.items.length })} ·{' '}
              {data.data.totals.map((x) => money(x.total, x.currency)).join(' · ')}
            </Text>
            <Card withBorder radius="lg" p={0}>
              {data.data.items.map((i) => (
                <Group
                  key={i.person.id}
                  justify="space-between"
                  wrap="nowrap"
                  px="md"
                  py="sm"
                  style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <AnchorLink
                      to="/personas/$id"
                      params={{ id: String(i.person.id) }}
                      search={{ tab: 'contributions' }}
                      size="sm"
                      fw={500}
                    >
                      {fullName(i.person)}
                    </AnchorLink>
                    <Text size="xs" c="dimmed">
                      {i.byCurrency
                        .map((c) => t('reports.countLine', { count: c.count, currency: c.currency }))
                        .join(' · ')}
                    </Text>
                  </div>
                  <Stack gap={0} align="flex-end">
                    {i.byCurrency.map((c) => (
                      <Amount key={c.currency} value={c.total} currency={c.currency} />
                    ))}
                  </Stack>
                </Group>
              ))}
            </Card>
          </>
        )
      )}
    </Stack>
  );
}

function ReportsPage() {
  const { t } = useTranslation('finance');
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: me } = useSuspenseQuery(meQuery());
  const canContributions = can(me, 'finanzas.diezmos_nominales');
  const tab =
    params.tab === 'contributions' && !canContributions
      ? 'income-statement'
      : (params.tab ?? 'income-statement');
  const set = (patch: Partial<Search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const tabs = TABS.filter((x) => x !== 'contributions' || canContributions);

  return (
    <>
      <PageHeader title={t('reports.title')} description={t('reports.description')} />
      <Tabs value={tab} onChange={(v) => v && set({ tab: v as Search['tab'] })} keepMounted={false}>
        <ScrollArea type="never" mb="md">
          <Tabs.List style={{ flexWrap: 'nowrap' }}>
            {tabs.map((x) => (
              <Tabs.Tab key={x} value={x}>
                {t(`reports.tabs.${x}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </ScrollArea>
        <Tabs.Panel value="income-statement">
          <IncomeStatementTab params={params} set={set} />
        </Tabs.Panel>
        <Tabs.Panel value="balances">
          <BalancesTab params={params} set={set} />
        </Tabs.Panel>
        <Tabs.Panel value="tithes-trend">
          <TrendTab params={params} set={set} />
        </Tabs.Panel>
        {canContributions && (
          <Tabs.Panel value="contributions">
            <ContributionsTab params={params} set={set} />
          </Tabs.Panel>
        )}
      </Tabs>
    </>
  );
}
