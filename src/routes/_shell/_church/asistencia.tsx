import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFileSpreadsheet, IconPencilPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { attendanceApi, type AttendanceItem } from '../../../api/attendance';
import type { LocalDateTime } from '../../../api/calendar';
import { saveBlob } from '../../../api/people';
import { requirePermission } from '../../../auth/guards';
import { can } from '../../../auth/permissions';
import { meQuery } from '../../../auth/session';
import { FormError } from '../../../components/FormError';
import { AttendanceModal } from '../../../features/attendance/AttendanceModal';
import { PERIODS, periodRange, weeklyTotals, type WeekTotal } from '../../../features/attendance/trend';
import { todayIso } from '../../../features/people/format';
import { errorMessage } from '../../../i18n/errors';
import { PageHeader } from '../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/asistencia')({
  validateSearch: z.object({ periodo: z.enum(PERIODS).optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'asistencia.ver', 'asistencia.registrar'),
  component: AttendancePage,
});

const fmt = (n: number | null) =>
  n === null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 1 });

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card withBorder radius="md" p="sm">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="xl">
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}

/** Barras por semana: presenciales y, arriba y más claro, online. */
function WeeklyChart({ weeks }: { weeks: WeekTotal[] }) {
  const { t } = useTranslation('calendar');
  const max = Math.max(...weeks.map((w) => w.inPerson + w.online), 1);
  const every = Math.ceil(weeks.length / 8); // etiquetas sin amontonarse
  return (
    <Box>
      <Group gap={3} align="flex-end" wrap="nowrap" h={160}>
        {weeks.map((w) => (
          <Tooltip
            key={w.week}
            withArrow
            label={t('attendance.chart.tooltip', {
              week: dayjs(w.week).format('L'),
              inPerson: w.inPerson,
              online: w.online,
              count: w.services,
            })}
          >
            <Stack gap={0} justify="flex-end" h="100%" style={{ flex: 1, minWidth: 0 }}>
              <Box h={`${(w.online / max) * 100}%`} bg="blue.2" style={{ borderRadius: '3px 3px 0 0' }} />
              <Box
                h={`${(w.inPerson / max) * 100}%`}
                bg="blue.6"
                style={{ borderRadius: w.online ? 0 : '3px 3px 0 0' }}
              />
            </Stack>
          </Tooltip>
        ))}
      </Group>
      <Group gap={3} wrap="nowrap" mt={4}>
        {weeks.map((w, i) => (
          <Text key={w.week} size="10px" c="dimmed" ta="center" style={{ flex: 1, minWidth: 0 }}>
            {i % every === 0 ? dayjs(w.week).format('D/M') : ''}
          </Text>
        ))}
      </Group>
      <Group gap="md" mt="xs">
        <Group gap={6}>
          <Box w={10} h={10} bg="blue.6" style={{ borderRadius: 2 }} />
          <Text size="xs">{t('attendance.fields.inPerson')}</Text>
        </Group>
        <Group gap={6}>
          <Box w={10} h={10} bg="blue.2" style={{ borderRadius: 2 }} />
          <Text size="xs">{t('attendance.fields.online')}</Text>
        </Group>
      </Group>
    </Box>
  );
}

function ItemRow({ item, onOpen }: { item: AttendanceItem; onOpen: () => void }) {
  const { t } = useTranslation('calendar');
  const a = item.attendance;
  return (
    <UnstyledButton
      onClick={onOpen}
      px="md"
      py="sm"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)', display: 'block', width: '100%' }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <div style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed">
            {dayjs(item.startsAt).format('ddd L · LT')}
          </Text>
          <Text size="sm" fw={500} truncate c={item.cancelled ? 'dimmed' : undefined}>
            {item.title}
          </Text>
          {a && (
            <Text size="xs" c="dimmed">
              {[
                t('attendance.breakdown.adults', { count: a.adults }),
                t('attendance.breakdown.children', { count: a.children }),
                a.newcomers > 0 && t('attendance.breakdown.newcomers', { count: a.newcomers }),
                a.online > 0 && t('attendance.breakdown.online', { count: a.online }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </div>
        {a ? (
          <Text fw={700} size="lg" style={{ flexShrink: 0 }}>
            {a.inPerson}
          </Text>
        ) : (
          <Badge variant="light" color={item.cancelled ? 'gray' : 'yellow'} style={{ flexShrink: 0 }}>
            {item.cancelled ? t('cancelled') : t('attendance.pending')}
          </Badge>
        )}
      </Group>
    </UnstyledButton>
  );
}

function AttendancePage() {
  const { t, i18n } = useTranslation(['calendar', 'common']);
  const { periodo = '3m' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const canRecord = can(me, 'asistencia.registrar');
  const range = periodRange(periodo, todayIso());
  const query = useQuery({
    queryKey: ['attendance', 'list', range],
    queryFn: () => attendanceApi.list(range),
  });
  const [target, setTarget] = useState<{ eventId: number; occurrence: LocalDateTime } | null>(null);
  const weekStartsOn = me.account?.weekStartsOn ?? 1;

  const exportXlsx = async () => {
    try {
      saveBlob(
        await attendanceApi.exportXlsx(range, i18n.resolvedLanguage ?? 'es'),
        `${t('attendance.file')}-${range.from}-${range.to}.xlsx`,
      );
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const open = (i: AttendanceItem) => setTarget({ eventId: i.eventId, occurrence: i.originalStart });
  const modal = (
    <AttendanceModal
      target={target}
      canEdit={canRecord}
      onClose={() => setTarget(null)}
      onSaved={(deleted) => {
        setTarget(null);
        void queryClient.invalidateQueries({ queryKey: ['attendance'] });
        notifications.show({
          color: 'teal',
          message: deleted ? t('attendance.deleted') : t('attendance.saved'),
        });
      }}
    />
  );

  const data = query.data;
  const s = data?.summary;
  const pending = data?.items.filter((i) => i.pending) ?? [];
  const history = data?.items.filter((i) => !i.pending) ?? [];
  const weeks = data ? weeklyTotals(data.items, weekStartsOn) : [];

  return (
    <>
      <PageHeader
        title={t('attendance.title')}
        description={t('attendance.description')}
        actions={
          <Button
            variant="default"
            leftSection={<IconFileSpreadsheet size={18} />}
            onClick={() => void exportXlsx()}
            disabled={!s?.recorded}
          >
            {t('attendance.export')}
          </Button>
        }
      />
      <Stack gap="md" maw={960}>
        <SegmentedControl
          value={periodo}
          onChange={(v) =>
            void navigate({ search: { periodo: v as (typeof PERIODS)[number] }, replace: true })
          }
          data={PERIODS.map((p) => ({ value: p, label: t(`attendance.periods.${p}`) }))}
          style={{ alignSelf: 'flex-start' }}
        />
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : (
          <>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <Stat
                label={t('attendance.stats.avgInPerson')}
                value={fmt(s!.avgInPerson)}
                hint={
                  s!.avgInPerson === null
                    ? undefined
                    : t('attendance.stats.split', {
                        adults: fmt(s!.avgAdults),
                        children: fmt(s!.avgChildren),
                      })
                }
              />
              <Stat label={t('attendance.stats.avgOnline')} value={fmt(s!.avgOnline)} />
              <Stat
                label={t('attendance.stats.newcomers')}
                value={fmt(s!.newcomers)}
                hint={t('attendance.stats.recorded', { count: s!.recorded })}
              />
              <Stat
                label={t('attendance.stats.peak')}
                value={s!.peak ? fmt(s!.peak.inPerson) : '—'}
                hint={s!.peak ? `${dayjs(s!.peak.startsAt).format('L')} · ${s!.peak.title}` : undefined}
              />
            </SimpleGrid>

            {pending.length > 0 && (
              <Card withBorder radius="lg" p={0}>
                <Group justify="space-between" p="md" pb="xs">
                  <Title order={3} size="h5">
                    {t('attendance.pendingTitle', { count: pending.length })}
                  </Title>
                </Group>
                {pending.map((i) => (
                  <Group
                    key={i.key}
                    justify="space-between"
                    wrap="nowrap"
                    px="md"
                    py="sm"
                    gap="sm"
                    style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Text size="xs" c="dimmed">
                        {dayjs(i.startsAt).format('ddd L · LT')}
                      </Text>
                      <Text size="sm" fw={500} truncate>
                        {i.title}
                      </Text>
                    </div>
                    {canRecord && (
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPencilPlus size={14} />}
                        onClick={() => open(i)}
                        style={{ flexShrink: 0 }}
                      >
                        {t('attendance.record')}
                      </Button>
                    )}
                  </Group>
                ))}
              </Card>
            )}

            <Card withBorder radius="lg">
              <Title order={3} size="h5" mb="sm">
                {t('attendance.chart.title')}
              </Title>
              {weeks.length ? (
                <WeeklyChart weeks={weeks} />
              ) : (
                <Text size="sm" c="dimmed">
                  {t('attendance.empty')}
                </Text>
              )}
            </Card>

            <Card withBorder radius="lg" p={0}>
              <Title order={3} size="h5" p="md" pb="xs">
                {t('attendance.history')}
              </Title>
              {history.length === 0 ? (
                <Text size="sm" c="dimmed" px="md" pb="md">
                  {t('attendance.empty')}
                </Text>
              ) : (
                history.map((i) => <ItemRow key={i.key} item={i} onOpen={() => open(i)} />)
              )}
            </Card>
          </>
        )}
      </Stack>
      {modal}
    </>
  );
}
