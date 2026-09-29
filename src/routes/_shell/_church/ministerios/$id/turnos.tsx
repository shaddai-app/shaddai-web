import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  CloseButton,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { EVENT_TYPES, type EventType } from '../../../../../api/calendar';
import {
  assignmentsApi,
  type AssignmentWarning,
  type Schedule,
  type ScheduleOccurrence,
} from '../../../../../api/ministries';
import { requirePermission } from '../../../../../auth/guards';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { ButtonLink } from '../../../../../components/links';
import { TYPE_COLORS, useWhenText } from '../../../../../features/calendar/common';
import { addDays, dayOf, startOfWeek } from '../../../../../features/calendar/dates';
import {
  coverage,
  STATUS_COLORS,
  warningsFor,
  type ScheduleWarning,
} from '../../../../../features/ministries/schedule';
import { fullName, todayIso } from '../../../../../features/people/format';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

const WEEKS = 4;

export const Route = createFileRoute('/_shell/_church/ministerios/$id/turnos')({
  validateSearch: z.object({ desde: z.iso.date().optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'ministerios.ver'),
  component: SchedulePage,
});

function useWarningText() {
  const { t } = useTranslation('ministries');
  return (w: ScheduleWarning | AssignmentWarning) => {
    switch (w.code) {
      case 'unavailable':
      case 'UNAVAILABLE':
        return w.reason
          ? t('schedule.warn.unavailableWhy', { reason: w.reason })
          : t('schedule.warn.unavailable');
      case 'sameDate':
        return t('schedule.warn.sameDate', { role: w.role });
      case 'elsewhere':
      case 'ALREADY_ASSIGNED':
        return t('schedule.warn.elsewhere', { ministry: w.ministry, role: w.role });
    }
  };
}

function OccurrenceCard({
  schedule,
  o,
  onChange,
}: {
  schedule: Schedule;
  o: ScheduleOccurrence;
  onChange: () => void;
}) {
  const { t } = useTranslation(['ministries', 'calendar', 'common']);
  const whenText = useWhenText();
  const warningText = useWarningText();
  const [busyRole, setBusyRole] = useState<number | null>(null);
  const cover = coverage(schedule, o);
  const editable = schedule.canAssign && !o.cancelled && o.endsAt >= dayjs().format('YYYY-MM-DDTHH:mm');

  const assign = async (serviceRoleId: number, personId: number) => {
    setBusyRole(serviceRoleId);
    try {
      const res = await assignmentsApi.assign(schedule.ministry.id, {
        eventId: o.eventId,
        occurrence: o.originalStart,
        serviceRoleId,
        personId,
      });
      notifications.show(
        res.warnings.length
          ? {
              color: 'yellow',
              message: `${t('schedule.assignedWithWarnings')} ${res.warnings.map(warningText).join(' · ')}`,
            }
          : { color: 'teal', message: t('schedule.assigned') },
      );
      onChange();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusyRole(null);
    }
  };
  const unassign = async (id: number) => {
    try {
      await assignmentsApi.unassign(schedule.ministry.id, id);
      onChange();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  return (
    <Card
      withBorder
      radius="lg"
      style={{ borderLeft: `4px solid var(--mantine-color-${TYPE_COLORS[o.type]}-6)` }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start" mb="xs">
        <div style={{ minWidth: 0 }}>
          <Text fw={600} truncate td={o.cancelled ? 'line-through' : undefined}>
            {o.title}
          </Text>
          <Text size="sm" c="dimmed">
            {whenText({ ...o, allDay: false })}
          </Text>
        </div>
        {o.cancelled ? (
          <Badge color="red" variant="light" style={{ flexShrink: 0 }}>
            {t('calendar:cancelled')}
          </Badge>
        ) : (
          cover.total > 0 && (
            <Badge
              variant="light"
              color={cover.covered === cover.total ? 'teal' : 'gray'}
              style={{ flexShrink: 0 }}
            >
              {t('schedule.coverage', cover)}
            </Badge>
          )
        )}
      </Group>
      {!o.cancelled && (
        <Stack gap={4}>
          {schedule.roles.map((role) => {
            const here = o.assignments.filter((a) => a.serviceRoleId === role.id);
            const taken = new Set(here.map((a) => a.person.id));
            return (
              <Group
                key={role.id}
                wrap="nowrap"
                align="flex-start"
                gap="xs"
                py={4}
                style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
              >
                <Text size="sm" c="dimmed" w={{ base: 96, sm: 180 }} style={{ flexShrink: 0 }} truncate>
                  {role.name}
                </Text>
                <Group gap={4} style={{ flex: 1, minWidth: 0 }}>
                  {here.map((a) => (
                    <Tooltip
                      key={a.id}
                      label={
                        a.status === 'declined' && a.declineReason
                          ? `${t(`schedule.status.${a.status}`)}: ${a.declineReason}`
                          : t(`schedule.status.${a.status}`)
                      }
                    >
                      <Badge
                        variant="light"
                        color={STATUS_COLORS[a.status]}
                        size="lg"
                        radius="sm"
                        tt="none"
                        fw={500}
                        td={a.status === 'declined' ? 'line-through' : undefined}
                        rightSection={
                          editable && (
                            <CloseButton
                              size="xs"
                              aria-label={t('schedule.remove', { name: fullName(a.person) })}
                              onClick={() => void unassign(a.id)}
                            />
                          )
                        }
                      >
                        {fullName(a.person)}
                      </Badge>
                    </Tooltip>
                  ))}
                  {editable && (
                    <Menu position="bottom-start" withinPortal shadow="md" width={280}>
                      <Menu.Target>
                        <ActionIcon
                          variant="light"
                          size="md"
                          loading={busyRole === role.id}
                          aria-label={t('schedule.assignTo', { role: role.name })}
                        >
                          <IconPlus size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown mah={320} style={{ overflowY: 'auto' }}>
                        <Menu.Label>{t('schedule.assignTo', { role: role.name })}</Menu.Label>
                        {schedule.members.length === 0 && (
                          <Menu.Item disabled>{t('schedule.noMembers')}</Menu.Item>
                        )}
                        {schedule.members.map((m) => {
                          const warns = warningsFor(schedule, o, m.id);
                          return (
                            <Menu.Item
                              key={m.id}
                              disabled={taken.has(m.id)}
                              onClick={() => void assign(role.id, m.id)}
                              leftSection={
                                warns.length ? (
                                  <IconAlertTriangle size={14} color="var(--mantine-color-yellow-6)" />
                                ) : undefined
                              }
                            >
                              <Text size="sm">{fullName(m)}</Text>
                              {warns.length > 0 && (
                                <Text size="xs" c="yellow">
                                  {warns.map(warningText).join(' · ')}
                                </Text>
                              )}
                            </Menu.Item>
                          );
                        })}
                      </Menu.Dropdown>
                    </Menu>
                  )}
                  {!editable && here.length === 0 && (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </Group>
              </Group>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}

function SchedulePage() {
  const { t } = useTranslation(['ministries', 'calendar', 'common']);
  const id = Number(Route.useParams().id);
  const { desde } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [types, setTypes] = useState<EventType[]>(['service', 'special']);
  const from = desde ?? todayIso();
  const to = addDays(from, WEEKS * 7 - 1);
  const { data: me } = useSuspenseQuery(meQuery());
  const weekStartsOn = me.account?.weekStartsOn ?? 1;
  const query = useQuery({
    queryKey: ['ministries', 'schedule', id, from, to, types.join(',')],
    queryFn: () => assignmentsApi.schedule(id, { from, to, types: types.join(',') }),
    placeholderData: keepPreviousData,
  });
  const go = (days: number) => void navigate({ search: { desde: addDays(from, days) }, replace: true });

  return (
    <>
      <PageHeader
        title={query.data ? t('schedule.titleOf', { name: query.data.ministry.name }) : t('schedule.title')}
        description={t('schedule.description')}
        actions={
          <ButtonLink to="/ministerios/$id" params={{ id: String(id) }} variant="default">
            {t('schedule.backToMinistry')}
          </ButtonLink>
        }
      />
      <Stack gap="md" maw={900}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => go(-WEEKS * 7)}
              aria-label={t('schedule.previous')}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Button
              variant="default"
              style={{ flexShrink: 0 }}
              onClick={() => void navigate({ search: {}, replace: true })}
            >
              {t('calendar:today')}
            </Button>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => go(WEEKS * 7)}
              aria-label={t('schedule.next')}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
            <Text size="sm" ml="xs">
              {t('schedule.range', { from: dayjs(from).format('L'), to: dayjs(to).format('L') })}
            </Text>
          </Group>
          <Chip.Group multiple value={types} onChange={(v) => v.length && setTypes(v as EventType[])}>
            <Group gap={6}>
              {EVENT_TYPES.map((type) => (
                <Chip key={type} value={type} size="xs" color={TYPE_COLORS[type]}>
                  {t(`calendar:types.${type}`)}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Group>
        <Group gap="md">
          {(['pending', 'accepted', 'declined'] as const).map((s) => (
            <Group key={s} gap={6}>
              <Box w={10} h={10} bg={`${STATUS_COLORS[s]}.6`} style={{ borderRadius: 2 }} />
              <Text size="xs">{t(`schedule.status.${s}`)}</Text>
            </Group>
          ))}
        </Group>
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : query.data.roles.length === 0 ? (
          <Text c="dimmed">{t('schedule.noRoles')}</Text>
        ) : query.data.occurrences.length === 0 ? (
          <Text c="dimmed">{t('schedule.empty')}</Text>
        ) : (
          <>
            {query.data.occurrences.map((o, i, all) => {
              const week = startOfWeek(dayOf(o.startsAt), weekStartsOn);
              const newWeek = i === 0 || week !== startOfWeek(dayOf(all[i - 1]!.startsAt), weekStartsOn);
              return (
                <Stack key={`${o.eventId}-${o.originalStart}`} gap="xs">
                  {newWeek && (
                    <Title order={3} size="h6" c="dimmed" mt={i ? 'sm' : 0}>
                      {t('schedule.weekOf', { date: dayjs(week).format('L') })}
                    </Title>
                  )}
                  <OccurrenceCard
                    schedule={query.data}
                    o={o}
                    onChange={() =>
                      void queryClient.invalidateQueries({ queryKey: ['ministries', 'schedule', id] })
                    }
                  />
                </Stack>
              );
            })}
          </>
        )}
      </Stack>
    </>
  );
}
