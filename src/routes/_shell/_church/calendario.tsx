import {
  ActionIcon,
  Button,
  Card,
  Chip,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { calendarApi, EVENT_TYPES, type Occurrence, type OccurrenceType } from '../../../api/calendar';
import { requirePermission } from '../../../auth/guards';
import { can } from '../../../auth/permissions';
import { meQuery } from '../../../auth/session';
import { FormError } from '../../../components/FormError';
import { TYPE_COLORS, weekdayName } from '../../../features/calendar/common';
import {
  byDay,
  monthGrid,
  rangeFor,
  shift,
  startOfWeek,
  addDays,
  type CalendarView,
} from '../../../features/calendar/dates';
import { EventFormModal } from '../../../features/calendar/EventFormModal';
import { OccurrenceChip, OccurrenceRow } from '../../../features/calendar/OccurrenceItem';
import { todayIso } from '../../../features/people/format';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
import { PageHeader } from '../../../layout/PageHeader';

const ALL_TYPES: OccurrenceType[] = [...EVENT_TYPES, 'cell'];
const search = z.object({
  view: z.enum(['month', 'week', 'agenda']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  hide: z.array(z.enum(['service', 'meeting', 'special', 'other', 'cell'])).optional(),
});

export const Route = createFileRoute('/_shell/_church/calendario')({
  validateSearch: search,
  beforeLoad: ({ context }) => requirePermission(context.me, 'eventos.ver'),
  component: CalendarPage,
});

const MAX_CHIPS = 3;

function CalendarPage() {
  const { t } = useTranslation(['calendar', 'common']);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const isMobile = useMediaQuery('(max-width: 48em)');
  const view: CalendarView = params.view ?? (isMobile ? 'agenda' : 'month');
  const today = todayIso();
  const anchor = params.date ?? today;
  const weekStartsOn = me.account?.weekStartsOn ?? 1;
  const hidden = new Set(params.hide ?? []);
  const types = ALL_TYPES.filter((x) => !hidden.has(x) && (x !== 'cell' || can(me, 'celulas.ver')));
  const { from, to } = rangeFor(view, anchor, weekStartsOn);
  const data = useQuery({
    queryKey: ['calendar', from, to, types],
    queryFn: () => calendarApi.range(from, to, types),
    placeholderData: keepPreviousData,
  });
  const [creating, setCreating] = useState<string | null>(null);
  const canManage = can(me, 'eventos.gestionar');
  const set = (patch: z.infer<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const items = data.data?.items ?? [];

  const title =
    view === 'month'
      ? dayjs(anchor).format('MMMM YYYY')
      : `${dayjs(from).format('D MMM')} – ${dayjs(to).format('D MMM YYYY')}`;

  const openDay = (day: string) => set({ view: 'agenda', date: day });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          canManage && (
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => setCreating(anchor < today ? today : anchor)}
            >
              {t('newEvent')}
            </Button>
          )
        }
      />
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={t('prev')}
              onClick={() => set({ date: shift(view, anchor, -1) })}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Button variant="default" onClick={() => set({ date: undefined })}>
              {t('today')}
            </Button>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={t('next')}
              onClick={() => set({ date: shift(view, anchor, 1) })}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
            <Title order={2} size="h4" ml="xs" tt="capitalize">
              {title}
            </Title>
          </Group>
          <SegmentedControl
            value={view}
            onChange={(v) => set({ view: v as CalendarView })}
            data={(['month', 'week', 'agenda'] as const).map((v) => ({ value: v, label: t(`views.${v}`) }))}
          />
        </Group>
        <Chip.Group
          multiple
          value={types}
          onChange={(v) => set({ hide: ALL_TYPES.filter((x) => !v.includes(x)) })}
        >
          <Group gap={6}>
            {ALL_TYPES.filter((x) => x !== 'cell' || can(me, 'celulas.ver')).map((x) => (
              <Chip key={x} value={x} size="xs" color={TYPE_COLORS[x]} variant="light">
                {t(`types.${x}`)}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <FormError error={data.error} />
        {data.isPending ? (
          <Loader />
        ) : view === 'month' ? (
          <MonthView
            anchor={anchor}
            weekStartsOn={weekStartsOn}
            today={today}
            items={items}
            onDay={openDay}
          />
        ) : view === 'week' ? (
          <SimpleGrid cols={{ base: 1, lg: 7 }} spacing={6}>
            {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor, weekStartsOn), i)).map((day) => {
              const list = byDay(items, [day]).get(day)!;
              return (
                <Card
                  key={day}
                  withBorder
                  radius="md"
                  p="xs"
                  bg={day === today ? 'var(--mantine-color-default-hover)' : undefined}
                >
                  <UnstyledButton onClick={() => openDay(day)}>
                    <Text size="xs" c="dimmed" tt="capitalize">
                      {dayjs(day).format('ddd')}
                    </Text>
                    <Text fw={700} c={day === today ? 'blue' : undefined}>
                      {dayjs(day).format('D')}
                    </Text>
                  </UnstyledButton>
                  <Stack gap={4} mt={4}>
                    {list.map((o) => (
                      <OccurrenceRow key={o.key} o={o} compact />
                    ))}
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          <AgendaView from={from} to={to} today={today} items={items} />
        )}
      </Stack>
      <EventFormModal
        opened={creating !== null}
        mode="create"
        defaultDate={creating ?? today}
        onClose={() => setCreating(null)}
        onSaved={(e) => {
          setCreating(null);
          void queryClient.invalidateQueries({ queryKey: ['calendar'] });
          void navigate({ to: '/eventos/$id', params: { id: String(e.id) } });
        }}
      />
    </>
  );
}

function MonthView({
  anchor,
  weekStartsOn,
  today,
  items,
  onDay,
}: {
  anchor: string;
  weekStartsOn: number;
  today: string;
  items: Occurrence[];
  onDay: (day: string) => void;
}) {
  const { t } = useTranslation('calendar');
  const wide = useMediaQuery('(min-width: 75em)');
  const weeks = monthGrid(anchor, weekStartsOn);
  const map = byDay(items, weeks.flat());
  const month = anchor.slice(0, 7);
  return (
    <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
      <SimpleGrid cols={7} spacing={0}>
        {weeks[0]!.map((d) => (
          <Text
            key={d}
            size="xs"
            c="dimmed"
            ta="center"
            py={6}
            tt="capitalize"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            {weekdayName(dayjs(d).day(), 'ddd')}
          </Text>
        ))}
        {weeks.flat().map((day) => {
          const list = map.get(day)!;
          const outside = day.slice(0, 7) !== month;
          return (
            <div
              key={day}
              style={{
                minHeight: 96,
                padding: 4,
                borderRight: '1px solid var(--mantine-color-default-border)',
                borderBottom: '1px solid var(--mantine-color-default-border)',
                opacity: outside ? 0.5 : 1,
                minWidth: 0,
              }}
            >
              <UnstyledButton onClick={() => onDay(day)} aria-label={dayjs(day).format('LL')}>
                <Text
                  size="xs"
                  fw={day === today ? 700 : 500}
                  c={day === today ? 'white' : undefined}
                  bg={day === today ? 'blue' : undefined}
                  px={6}
                  style={{ borderRadius: 99 }}
                >
                  {dayjs(day).format('D')}
                </Text>
              </UnstyledButton>
              <Stack gap={1} mt={2}>
                {list.slice(0, MAX_CHIPS).map((o) => (
                  <OccurrenceChip key={o.key} o={o} showTime={Boolean(wide)} />
                ))}
                {list.length > MAX_CHIPS && (
                  <UnstyledButton onClick={() => onDay(day)}>
                    <Text size="xs" c="dimmed" px={4}>
                      {t('more', { count: list.length - MAX_CHIPS })}
                    </Text>
                  </UnstyledButton>
                )}
              </Stack>
            </div>
          );
        })}
      </SimpleGrid>
    </Card>
  );
}

function AgendaView({
  from,
  to,
  today,
  items,
}: {
  from: string;
  to: string;
  today: string;
  items: Occurrence[];
}) {
  const { t } = useTranslation('calendar');
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const map = byDay(items, days);
  const withItems = days.filter((d) => map.get(d)!.length > 0);
  if (!withItems.length) return <Text c="dimmed">{t('empty')}</Text>;
  return (
    <Stack gap="md" maw={720}>
      {withItems.map((day) => (
        <div key={day}>
          <Text size="sm" fw={700} c={day === today ? 'blue' : undefined} mb={6}>
            {day === today ? `${t('today')} · ` : ''}
            {capitalize(dayjs(day).format('dddd, LL'))}
          </Text>
          <Stack gap={6}>
            {map.get(day)!.map((o) => (
              <OccurrenceRow key={o.key} o={o} />
            ))}
          </Stack>
        </div>
      ))}
    </Stack>
  );
}
