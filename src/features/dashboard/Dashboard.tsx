import {
  Alert,
  Badge,
  Card,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight, IconMinus, IconUserPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  dashboardApi,
  DASHBOARD_PERIODS,
  type Compared,
  type Dashboard as DashboardData,
  type DashboardPeriod,
} from '../../api/dashboard';
import { FormError } from '../../components/FormError';
import { AnchorLink } from '../../components/links';
import { OccurrenceRow } from '../calendar/OccurrenceItem';
import { useMoney } from '../finance/common';
import { delta, trendColor } from './delta';

/** Pantallas a las que lleva cada bloque. */
type BlockRoute =
  | '/asistencia'
  | '/personas'
  | '/personas/nuevos'
  | '/celulas'
  | '/celulas/reportes'
  | '/consolidacion'
  | '/finanzas'
  | '/calendario';

const number = (n: number | null) =>
  n === null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 1 });

/** Variación contra el período anterior: flecha y porcentaje (o "nuevo" si antes era 0). */
function DeltaBadge({ value, invert }: { value: Compared<number | null>; invert?: boolean }) {
  const { t } = useTranslation();
  const d = delta(value);
  // Sin movimiento en ninguno de los dos períodos no hay nada que comparar.
  if (!d || (value.current === 0 && value.previous === 0)) return null;
  const Icon = d.trend === 'up' ? IconArrowUpRight : d.trend === 'down' ? IconArrowDownRight : IconMinus;
  return (
    <Badge
      size="sm"
      variant="light"
      color={trendColor(d.trend, invert)}
      leftSection={<Icon size={12} />}
      title={t('dashboard.previous', { value: number(value.previous) })}
    >
      {d.percent === null ? t('dashboard.new') : `${Math.abs(d.percent)}%`}
    </Badge>
  );
}

function Metric({
  label,
  value,
  compared,
  invert,
  color,
}: {
  label: string;
  value: ReactNode;
  compared?: Compared<number | null>;
  invert?: boolean;
  color?: string;
}) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Group gap={6} align="baseline" wrap="wrap">
        <Text fw={700} size="xl" c={color}>
          {value}
        </Text>
        {compared && <DeltaBadge value={compared} invert={invert} />}
      </Group>
    </div>
  );
}

function Block({ title, link, children }: { title: string; link?: ReactNode; children: ReactNode }) {
  return (
    <Card withBorder radius="lg">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Title order={3} size="h5">
          {title}
        </Title>
        {link}
      </Group>
      {children}
    </Card>
  );
}

/** Tablero de inicio: bloques según los permisos, comparados con el período anterior. */
export function Dashboard({
  period,
  onPeriod,
}: {
  period: DashboardPeriod;
  onPeriod: (p: DashboardPeriod) => void;
}) {
  const { t } = useTranslation();
  const money = useMoney();
  const query = useQuery({ queryKey: ['dashboard', period], queryFn: () => dashboardApi.get(period) });
  const link = (to: BlockRoute, label = t('dashboard.see')) => (
    <AnchorLink to={to} size="sm">
      {label}
    </AnchorLink>
  );

  // El período solo importa si hay algún bloque con cifras del período (no solo próximos eventos).
  const d = query.data;
  const periodic =
    !d || Boolean(d.people || d.consolidation || d.cells?.meetings || d.attendance || d.finance);

  return (
    <Stack gap="md">
      {periodic && (
        <Group justify="space-between" wrap="wrap" gap="sm">
          <SegmentedControl
            value={period}
            onChange={(v) => onPeriod(v as DashboardPeriod)}
            data={DASHBOARD_PERIODS.map((p) => ({ value: p, label: t(`dashboard.periods.${p}`) }))}
          />
          <Text size="xs" c="dimmed">
            {t('dashboard.comparedTo')}
          </Text>
        </Group>
      )}
      {query.isPending ? (
        <Loader />
      ) : query.isError ? (
        <FormError error={query.error} />
      ) : (
        <DashboardBlocks d={query.data} link={link} money={money} />
      )}
    </Stack>
  );
}

function DashboardBlocks({
  d,
  link,
  money,
}: {
  d: DashboardData;
  link: (to: BlockRoute, label?: string) => ReactNode;
  money: ReturnType<typeof useMoney>;
}) {
  const { t } = useTranslation();
  const alerts = [
    d.newcomers && d.newcomers.pending > 0 && (
      <Alert key="newcomers" color="blue" variant="light" icon={<IconUserPlus size={18} />} p="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="sm">{t('dashboard.newcomersPending', { count: d.newcomers.pending })}</Text>
          {link('/personas/nuevos', t('dashboard.review'))}
        </Group>
      </Alert>
    ),
  ].filter(Boolean);

  return (
    <>
      {alerts}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {d.attendance && (
          <Block title={t('dashboard.attendance.title')} link={link('/asistencia')}>
            <SimpleGrid cols={2} spacing="sm">
              <Metric
                label={t('dashboard.attendance.avgInPerson')}
                value={number(d.attendance.avgInPerson.current)}
                compared={d.attendance.avgInPerson}
              />
              <Metric
                label={t('dashboard.attendance.avgOnline')}
                value={number(d.attendance.avgOnline.current)}
                compared={d.attendance.avgOnline}
              />
              <Metric
                label={t('dashboard.attendance.newcomers')}
                value={number(d.attendance.newcomers.current)}
                compared={d.attendance.newcomers}
              />
              <Metric
                label={t('dashboard.attendance.pending')}
                value={d.attendance.pending}
                color={d.attendance.pending ? 'yellow' : undefined}
              />
            </SimpleGrid>
          </Block>
        )}
        {d.people && (
          <Block title={t('dashboard.people.title')} link={link('/personas')}>
            <SimpleGrid cols={2} spacing="sm">
              <Metric label={t('dashboard.people.total')} value={number(d.people.total)} />
              <Metric
                label={t('dashboard.people.added')}
                value={number(d.people.added.current)}
                compared={d.people.added}
              />
              <Metric label={t('dashboard.people.members')} value={number(d.people.members)} />
              <Metric label={t('dashboard.people.visitors')} value={number(d.people.visitors)} />
            </SimpleGrid>
          </Block>
        )}
        {d.cells && (
          <Block
            title={t('dashboard.cells.title')}
            link={link(d.cells.meetings ? '/celulas/reportes' : '/celulas')}
          >
            <SimpleGrid cols={2} spacing="sm">
              <Metric label={t('dashboard.cells.active')} value={number(d.cells.active)} />
              {d.cells.meetings && (
                <>
                  <Metric
                    label={t('dashboard.cells.held')}
                    value={number(d.cells.meetings.held.current)}
                    compared={d.cells.meetings.held}
                  />
                  <Metric
                    label={t('dashboard.cells.avgAttendance')}
                    value={number(d.cells.meetings.avgAttendance.current)}
                    compared={d.cells.meetings.avgAttendance}
                  />
                  <Metric
                    label={t('dashboard.cells.visitors')}
                    value={number(d.cells.meetings.visitors.current)}
                    compared={d.cells.meetings.visitors}
                  />
                </>
              )}
            </SimpleGrid>
          </Block>
        )}
        {d.consolidation && (
          <Block title={t('dashboard.consolidation.title')} link={link('/consolidacion')}>
            <SimpleGrid cols={2} spacing="sm">
              <Metric label={t('dashboard.consolidation.open')} value={number(d.consolidation.open)} />
              <Metric
                label={t('dashboard.consolidation.overdue')}
                value={number(d.consolidation.overdue)}
                color={d.consolidation.overdue ? 'red' : undefined}
              />
              <Metric
                label={t('dashboard.consolidation.unassigned')}
                value={number(d.consolidation.unassigned)}
                color={d.consolidation.unassigned ? 'yellow' : undefined}
              />
              <Metric
                label={t('dashboard.consolidation.completed')}
                value={number(d.consolidation.completed.current)}
                compared={d.consolidation.completed}
              />
            </SimpleGrid>
          </Block>
        )}
        {d.finance && (
          <Block title={t('dashboard.finance.title')} link={link('/finanzas')}>
            <Stack gap="sm">
              {d.finance.totals.length === 0 && (
                <Text size="sm" c="dimmed">
                  {t('dashboard.finance.empty')}
                </Text>
              )}
              {d.finance.totals.map((f) => (
                <SimpleGrid key={f.currency} cols={{ base: 1, xs: 3 }} spacing="sm">
                  <Metric
                    label={t('dashboard.finance.income', { currency: f.currency })}
                    value={money(f.income.current, f.currency, { whole: true })}
                    compared={f.income}
                  />
                  <Metric
                    label={t('dashboard.finance.expense', { currency: f.currency })}
                    value={money(f.expense.current, f.currency, { whole: true })}
                    compared={f.expense}
                    invert
                  />
                  <Metric
                    label={t('dashboard.finance.net', { currency: f.currency })}
                    value={money(f.net.current, f.currency, { whole: true })}
                    color={f.net.current < 0 ? 'red' : undefined}
                  />
                </SimpleGrid>
              ))}
              {d.finance.pendingOfferings > 0 && (
                <Text size="sm" c="yellow">
                  {t('dashboard.finance.pendingOfferings', { count: d.finance.pendingOfferings })}
                </Text>
              )}
            </Stack>
          </Block>
        )}
        {d.upcoming && (
          <Block title={t('dashboard.upcoming.title')} link={link('/calendario')}>
            {d.upcoming.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('dashboard.upcoming.empty')}
              </Text>
            ) : (
              <Stack gap={6}>
                {d.upcoming.map((o) => (
                  <OccurrenceRow key={o.key} o={o} showDate />
                ))}
              </Stack>
            )}
          </Block>
        )}
      </SimpleGrid>
    </>
  );
}
