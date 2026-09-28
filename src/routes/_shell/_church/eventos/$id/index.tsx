import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowBackUp,
  IconCalendarOff,
  IconClock,
  IconDots,
  IconMapPin,
  IconPencil,
  IconRepeat,
  IconTicket,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { calendarApi, type CalendarEvent, type Occurrence } from '../../../../../api/calendar';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { AnchorLink, ButtonLink } from '../../../../../components/links';
import { TYPE_COLORS, useRecurrenceText, useWhenText } from '../../../../../features/calendar/common';
import { dayOf } from '../../../../../features/calendar/dates';
import { EventFormModal, type EventFormMode } from '../../../../../features/calendar/EventFormModal';
import { OccurrenceRow } from '../../../../../features/calendar/OccurrenceItem';
import { OccurrenceModal, type OccurrenceAction } from '../../../../../features/calendar/OccurrenceModal';
import { useChurchCurrency, useMoney } from '../../../../../features/finance/common';
import { fullName, todayIso } from '../../../../../features/people/format';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

export const Route = createFileRoute('/_shell/_church/eventos/$id/')({
  validateSearch: z.object({ fecha: localDateTime.optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'eventos.ver'),
  component: EventPage,
});

const eventKey = (id: number) => ['calendar', 'event', id];

/** La fecha elegida de una serie, con su excepción aplicada si la tiene. */
function occurrenceAt(e: CalendarEvent, originalStart: string): Occurrence {
  const duration = dayjs(e.endsAt).diff(dayjs(e.startsAt), 'minute');
  const x = e.exceptions.find((ex) => ex.originalStart === originalStart);
  const start = x?.newStartsAt ?? originalStart;
  const end = x?.newEndsAt ?? dayjs(start).add(duration, 'minute').format('YYYY-MM-DDTHH:mm');
  return {
    key: `e${e.id}-${originalStart}`,
    source: 'event',
    eventId: e.id,
    cellId: null,
    type: e.type,
    title: e.title,
    location: e.location,
    startsAt: start,
    endsAt: end,
    allDay: e.allDay,
    recurring: Boolean(e.recurrence),
    registration: e.registrationEnabled,
    originalStart,
    cancelled: Boolean(x?.cancelled),
    moved: Boolean(x && !x.cancelled && x.newStartsAt),
    note: x?.note ?? null,
  };
}

function EventPage() {
  const { t } = useTranslation(['calendar', 'common']);
  const id = Number(Route.useParams().id);
  const { fecha } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const recurrenceText = useRecurrenceText();
  const whenText = useWhenText();
  const money = useMoney();
  const currency = useChurchCurrency();
  const query = useQuery({ queryKey: eventKey(id), queryFn: () => calendarApi.event(id) });
  const [editing, setEditing] = useState<EventFormMode | null>(null);
  const [action, setAction] = useState<OccurrenceAction | null>(null);

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const e = query.data;
  const canManage = can(me, 'eventos.gestionar');
  const recurring = Boolean(e.recurrence);
  const selected = recurring && fecha ? occurrenceAt(e, fecha) : null;
  const exception = selected
    ? e.exceptions.find((x) => x.originalStart === selected.originalStart)
    : undefined;
  const isFirst = selected?.originalStart === e.startsAt;

  const refresh = (saved: CalendarEvent) => {
    queryClient.setQueryData(eventKey(saved.id), saved);
    void queryClient.invalidateQueries({
      queryKey: ['calendar'],
      predicate: (q) => q.queryKey[1] !== 'event',
    });
  };
  const restore = async () => {
    try {
      refresh(await calendarApi.clearException(e.id, selected!.originalStart));
      notifications.show({ color: 'teal', message: t('occurrence.restored') });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };
  const remove = () =>
    modals.openConfirmModal({
      title: t('event.deleteTitle', { title: e.title }),
      children: <Text size="sm">{recurring ? t('event.deleteSeriesBody') : t('event.deleteBody')}</Text>,
      labels: { confirm: t('event.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await calendarApi.remove(e.id);
          void queryClient.invalidateQueries({ queryKey: ['calendar'] });
          void navigate({ to: '/calendario' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        title={e.title}
        badge={
          <Badge color={TYPE_COLORS[e.type]} variant="light">
            {t(`types.${e.type}`)}
          </Badge>
        }
        actions={
          canManage && (
            <Group gap="xs">
              <Button leftSection={<IconPencil size={18} />} onClick={() => setEditing('series')}>
                {recurring ? t('event.editSeries') : t('event.edit')}
              </Button>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" aria-label={t('common:actions.more')}>
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={remove}>
                    {t('event.delete')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )
        }
      />
      <Stack gap="md" maw={820}>
        {selected && (
          <Card withBorder radius="lg">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
              {t('occurrence.title')}
            </Text>
            <Group justify="space-between" align="center" mt={4} wrap="wrap" gap="sm">
              <div>
                <Text fw={600} td={selected.cancelled ? 'line-through' : undefined}>
                  {whenText(selected)}
                </Text>
                {selected.cancelled && (
                  <Text size="sm" c="red">
                    {t('occurrence.cancelledNote', { note: selected.note ?? t('cancelled') })}
                  </Text>
                )}
                {selected.moved && (
                  <Text size="sm" c="blue">
                    {t('occurrence.movedFrom', { date: dayjs(selected.originalStart).format('ddd L LT') })}
                    {selected.note ? ` · ${selected.note}` : ''}
                  </Text>
                )}
              </div>
              {canManage && (
                <Group gap="xs">
                  {exception ? (
                    <Button
                      variant="default"
                      leftSection={<IconArrowBackUp size={16} />}
                      onClick={() => void restore()}
                    >
                      {t('occurrence.restore')}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        leftSection={<IconClock size={16} />}
                        onClick={() => setAction('move')}
                      >
                        {t('occurrence.move')}
                      </Button>
                      <Button
                        variant="default"
                        color="red"
                        leftSection={<IconCalendarOff size={16} />}
                        onClick={() => setAction('cancel')}
                      >
                        {t('occurrence.cancel')}
                      </Button>
                    </>
                  )}
                  {!isFirst && (
                    <Button
                      variant="subtle"
                      leftSection={<IconRepeat size={16} />}
                      onClick={() => setEditing('following')}
                    >
                      {t('occurrence.editFollowing')}
                    </Button>
                  )}
                </Group>
              )}
            </Group>
          </Card>
        )}

        <Card withBorder radius="lg">
          <Stack gap={8}>
            <Group gap={8} wrap="nowrap" align="flex-start">
              {recurring ? <IconRepeat size={18} /> : <IconClock size={18} />}
              <div>
                <Text fw={500}>{recurring ? recurrenceText(e.recurrence!, e.startsAt) : whenText(e)}</Text>
                {recurring && (
                  <Text size="sm" c="dimmed">
                    {e.allDay
                      ? t('allDay')
                      : t('range.hours', { from: e.startsAt.slice(11), to: e.endsAt.slice(11) })}{' '}
                    · {t('event.since', { date: dayjs(dayOf(e.startsAt)).format('L') })}
                  </Text>
                )}
              </div>
            </Group>
            {e.location && (
              <Group gap={8} wrap="nowrap">
                <IconMapPin size={18} />
                <Text>{e.location}</Text>
              </Group>
            )}
            {e.description && (
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} mt="xs">
                {e.description}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt="xs">
              {t('event.createdBy', {
                name: e.createdBy ? fullName(e.createdBy) : '—',
                date: dayjs(e.createdAt).format('L'),
              })}
            </Text>
          </Stack>
        </Card>
        {e.registrationEnabled && (
          <Card withBorder radius="lg">
            <Group justify="space-between" wrap="wrap" gap="sm">
              <div>
                <Title order={3} size="h5">
                  {t('registrations.title')}
                </Title>
                <Text size="sm" c="dimmed">
                  {[
                    e.capacity !== null
                      ? t('registrations.capacityOf', { count: e.capacity })
                      : t('registrations.noCapacity'),
                    e.waitlistEnabled && t('registrations.withWaitlist'),
                    e.price !== null && money(e.price, currency),
                    e.isPublic && t('registrations.publicLink'),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </div>
              {can(me, 'eventos.inscripciones') && (
                <ButtonLink
                  to="/eventos/$id/inscripciones"
                  params={{ id: String(e.id) }}
                  search={{
                    fecha: selected?.originalStart ?? (recurring ? e.upcoming[0]?.originalStart : e.startsAt),
                  }}
                  variant="light"
                  leftSection={<IconTicket size={16} />}
                >
                  {t('registrations.open')}
                </ButtonLink>
              )}
            </Group>
          </Card>
        )}

        {recurring && (
          <Card withBorder radius="lg">
            <Title order={3} size="h5" mb="sm">
              {t('event.upcoming')}
            </Title>
            {e.upcoming.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('event.noUpcoming')}
              </Text>
            ) : (
              <Stack gap={6}>
                {e.upcoming.map((o) => (
                  <OccurrenceRow key={o.key} o={o} showDate />
                ))}
              </Stack>
            )}
          </Card>
        )}

        {recurring && e.exceptions.length > 0 && (
          <Card withBorder radius="lg">
            <Title order={3} size="h5" mb="sm">
              {t('event.exceptions')}
            </Title>
            <Stack gap={4}>
              {e.exceptions.map((x) => (
                <Group key={x.originalStart} justify="space-between" wrap="nowrap" gap="sm">
                  <AnchorLink
                    to="/eventos/$id"
                    params={{ id: String(e.id) }}
                    search={{ fecha: x.originalStart }}
                    size="sm"
                  >
                    {dayjs(x.originalStart).format('ddd L')}
                  </AnchorLink>
                  <Text size="sm" c={x.cancelled ? 'red' : 'blue'} truncate>
                    {x.cancelled
                      ? (x.note ?? t('cancelled'))
                      : `${t('moved')}: ${dayjs(x.newStartsAt!).format('ddd L LT')}${x.note ? ` · ${x.note}` : ''}`}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Card>
        )}
        {!recurring && dayOf(e.endsAt) < todayIso() && (
          <Alert color="gray" variant="light">
            {t('event.past')}
          </Alert>
        )}
      </Stack>

      <EventFormModal
        opened={editing !== null}
        mode={editing ?? 'series'}
        event={e}
        occurrence={editing === 'following' ? selected : null}
        defaultDate={dayOf(e.startsAt)}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          const mode = editing;
          setEditing(null);
          refresh(saved);
          if (saved.removedExceptions) {
            notifications.show({
              color: 'yellow',
              message: t('event.removedExceptions', { count: saved.removedExceptions }),
            });
          } else {
            notifications.show({ color: 'teal', message: t('common:saved') });
          }
          // "Desde esta fecha" crea otro evento: se pasa a verlo.
          if (mode === 'following') {
            void navigate({
              to: '/eventos/$id',
              params: { id: String(saved.id) },
              search: { fecha: saved.startsAt },
            });
          }
        }}
      />
      <OccurrenceModal
        action={action}
        eventId={e.id}
        occurrence={selected}
        onClose={() => setAction(null)}
        onSaved={(saved) => {
          const done = action;
          setAction(null);
          refresh(saved);
          notifications.show({ color: 'teal', message: t(`occurrence.${done ?? 'move'}Done`) });
        }}
      />
    </>
  );
}
