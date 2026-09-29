import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCalendarOff, IconCheck, IconMapPin, IconTrash, IconX } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assignmentsApi, type MyAssignment } from '../../../api/ministries';
import { FormError } from '../../../components/FormError';
import { useWhenText } from '../../../features/calendar/common';
import { STATUS_COLORS } from '../../../features/ministries/schedule';
import { formatDate, fullName, todayIso } from '../../../features/people/format';
import { errorMessage } from '../../../i18n/errors';
import { PageHeader } from '../../../layout/PageHeader';

// Cualquier usuario de la iglesia: sus turnos (si su usuario está vinculado a una ficha).
export const Route = createFileRoute('/_shell/_church/mis-turnos')({
  component: MyAssignmentsPage,
});

const assignmentsKey = ['me', 'assignments'];
const unavailabilityKey = ['me', 'unavailability'];

function DeclineForm({ a, onDone }: { a: MyAssignment; onDone: () => void }) {
  const { t } = useTranslation(['ministries', 'common']);
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          queryClient.setQueryData(
            assignmentsKey,
            await assignmentsApi.respond(a.id, 'decline', reason.trim() || null),
          );
          notifications.show({ color: 'teal', message: t('mine.declined') });
          onDone();
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <Textarea
          label={t('mine.reason')}
          placeholder={t('mine.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          maxLength={300}
          autosize
          minRows={2}
          data-autofocus
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" color="red" loading={busy}>
            {t('mine.decline')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function AssignmentCard({ a }: { a: MyAssignment }) {
  const { t } = useTranslation(['ministries', 'calendar']);
  const whenText = useWhenText();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    setBusy(true);
    try {
      queryClient.setQueryData(assignmentsKey, await assignmentsApi.respond(a.id, 'accept'));
      notifications.show({ color: 'teal', message: t('mine.accepted') });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  const decline = () => {
    const id = modals.open({
      title: t('mine.declineTitle', { role: a.role, event: a.event.title }),
      children: <DeclineForm a={a} onDone={() => modals.close(id)} />,
    });
  };
  const color = a.ministry.color ?? 'blue';
  return (
    <Card withBorder radius="lg" style={{ borderLeft: `4px solid var(--mantine-color-${color}-6)` }}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <div style={{ minWidth: 0 }}>
          <Text fw={600} td={a.cancelled ? 'line-through' : undefined}>
            {a.role} · {a.ministry.name}
          </Text>
          <Text size="sm">{a.event.title}</Text>
          <Text size="sm" c="dimmed">
            {whenText({ startsAt: a.startsAt, endsAt: a.endsAt, allDay: a.event.allDay })}
          </Text>
          {a.event.location && (
            <Group gap={4} wrap="nowrap">
              <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" truncate>
                {a.event.location}
              </Text>
            </Group>
          )}
        </div>
        <Badge
          variant="light"
          color={a.cancelled ? 'red' : STATUS_COLORS[a.status]}
          style={{ flexShrink: 0 }}
        >
          {a.cancelled ? t('calendar:cancelled') : t(`schedule.status.${a.status}`)}
        </Badge>
      </Group>
      {a.notes && (
        <Text size="sm" mt="xs" style={{ whiteSpace: 'pre-wrap' }}>
          {a.notes}
        </Text>
      )}
      {a.status === 'declined' && a.declineReason && (
        <Text size="xs" c="dimmed" mt={4}>
          {t('mine.yourReason', { reason: a.declineReason })}
        </Text>
      )}
      {a.team.length > 0 && (
        <Text size="xs" c="dimmed" mt="xs">
          {t('mine.team')}{' '}
          {a.team
            .filter((m) => m.status !== 'declined')
            .map((m) => `${fullName(m.person)} (${m.role})`)
            .join(', ') || '—'}
        </Text>
      )}
      {!a.cancelled && (
        <Group gap="xs" mt="sm">
          {a.status !== 'accepted' && (
            <Button
              size="sm"
              color="teal"
              leftSection={<IconCheck size={16} />}
              loading={busy}
              onClick={() => void accept()}
            >
              {t('mine.accept')}
            </Button>
          )}
          {a.status !== 'declined' && (
            <Button
              size="sm"
              variant="default"
              color="red"
              leftSection={<IconX size={16} />}
              onClick={decline}
            >
              {t('mine.decline')}
            </Button>
          )}
        </Group>
      )}
    </Card>
  );
}

function UnavailabilityCard() {
  const { t } = useTranslation(['ministries', 'common']);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: unavailabilityKey, queryFn: assignmentsApi.unavailability });
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = Boolean(fromDate && toDate && toDate >= fromDate);

  return (
    <Card withBorder radius="lg">
      <Title order={3} size="h5">
        {t('mine.unavailable.title')}
      </Title>
      <Text size="xs" c="dimmed" mb="sm">
        {t('mine.unavailable.hint')}
      </Text>
      {query.data && query.data.items.length > 0 && (
        <Stack gap={0} mb="sm">
          {query.data.items.map((u) => (
            <Group
              key={u.id}
              justify="space-between"
              wrap="nowrap"
              py={6}
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              <div>
                <Text size="sm">
                  {u.fromDate === u.toDate
                    ? formatDate(u.fromDate)
                    : t('mine.unavailable.range', { from: formatDate(u.fromDate), to: formatDate(u.toDate) })}
                </Text>
                {u.reason && (
                  <Text size="xs" c="dimmed">
                    {u.reason}
                  </Text>
                )}
              </div>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={t('mine.unavailable.remove')}
                onClick={async () => {
                  try {
                    queryClient.setQueryData(
                      unavailabilityKey,
                      await assignmentsApi.removeUnavailability(u.id),
                    );
                  } catch (err) {
                    notifications.show({ color: 'red', message: errorMessage(err) });
                  }
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setBusy(true);
          setError(null);
          try {
            const res = await assignmentsApi.addUnavailability({
              fromDate,
              toDate,
              reason: reason.trim() || null,
            });
            queryClient.setQueryData(unavailabilityKey, { linked: res.linked, items: res.items });
            setReason('');
            notifications.show(
              res.conflicts
                ? { color: 'yellow', message: t('mine.unavailable.conflicts', { count: res.conflicts }) }
                : { color: 'teal', message: t('mine.unavailable.added') },
            );
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Stack gap="xs">
          <FormError error={error} />
          <SimpleGrid cols={2} spacing="xs">
            <TextInput
              type="date"
              label={t('mine.unavailable.from')}
              value={fromDate}
              min={todayIso()}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setFromDate(v);
                if (toDate < v) setToDate(v);
              }}
              required
            />
            <TextInput
              type="date"
              label={t('mine.unavailable.to')}
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.currentTarget.value)}
              required
            />
          </SimpleGrid>
          <TextInput
            label={t('mine.unavailable.reason')}
            placeholder={t('mine.unavailable.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            maxLength={200}
          />
          <Button
            type="submit"
            variant="light"
            leftSection={<IconCalendarOff size={16} />}
            loading={busy}
            disabled={!valid}
            style={{ alignSelf: 'flex-start' }}
          >
            {t('mine.unavailable.add')}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

function MyAssignmentsPage() {
  const { t } = useTranslation('ministries');
  const query = useQuery({ queryKey: assignmentsKey, queryFn: assignmentsApi.mine });
  const pending = query.data?.items.filter((a) => a.status === 'pending' && !a.cancelled).length ?? 0;

  return (
    <>
      <PageHeader title={t('mine.title')} description={t('mine.description')} />
      {query.isPending ? (
        <Loader />
      ) : query.isError ? (
        <FormError error={query.error} />
      ) : !query.data.linked ? (
        <Alert color="gray" variant="light" maw={620}>
          {t('mine.notLinked')}
        </Alert>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" maw={1100} style={{ alignItems: 'start' }}>
          <Stack gap="sm">
            {pending > 0 && (
              <Alert color="yellow" variant="light" p="sm">
                {t('mine.pendingCount', { count: pending })}
              </Alert>
            )}
            {query.data.items.length === 0 ? (
              <Text c="dimmed">{t('mine.empty')}</Text>
            ) : (
              query.data.items.map((a, i, all) => (
                <Stack key={a.id} gap={6}>
                  {(i === 0 || all[i - 1]!.startsAt.slice(0, 10) !== a.startsAt.slice(0, 10)) && (
                    <Text size="sm" fw={600} c="dimmed" tt="capitalize" mt={i ? 'xs' : 0}>
                      {dayjs(a.startsAt).format('dddd L')}
                    </Text>
                  )}
                  <AssignmentCard a={a} />
                </Stack>
              ))
            )}
          </Stack>
          <UnavailabilityCard />
        </SimpleGrid>
      )}
    </>
  );
}
