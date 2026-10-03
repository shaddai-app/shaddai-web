import {
  ActionIcon,
  Button,
  Card,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coursesApi, type CourseSession, type RosterEntry } from '../../api/courses';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { errorMessage } from '../../i18n/errors';
import { formatDate, fullName, todayIso } from '../people/format';
import { coursesKey } from './common';

/** Formulario de una clase: fecha, tema, notas y asistencia (presente / ausente por persona). */
function SessionForm({
  levelId,
  session,
  canEdit,
  onClose,
  onSaved,
  onDelete,
}: {
  levelId: number;
  session: CourseSession | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation(['courses', 'common']);
  const [date, setDate] = useState(session?.date ?? todayIso());
  const [topic, setTopic] = useState(session?.topic ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');
  // Cambios de asistencia hechos en el formulario (el resto, como vino de la API).
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Clase nueva: la lista sale de quienes estaban inscriptos esa fecha.
  const roster = useQuery({
    queryKey: [...coursesKey, 'roster', levelId, date],
    queryFn: () => coursesApi.roster(levelId, date).then((r) => r.items),
    enabled: !session && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
  const entries: RosterEntry[] = session ? session.roster : (roster.data ?? []);
  const isPresent = (e: RosterEntry) => marks[e.enrollmentId] ?? e.present ?? false;
  const presentCount = entries.filter(isPresent).length;
  const allPresent = entries.length > 0 && presentCount === entries.length;

  return (
    <form
      onSubmit={async (ev) => {
        ev.preventDefault();
        if (!canEdit) return;
        setBusy(true);
        setError(null);
        // Se manda la asistencia de toda la lista: quien no se marcó, ausente.
        const attendance = entries.map((e) => ({ enrollmentId: e.enrollmentId, present: isPresent(e) }));
        const body = { date, topic: topic.trim() || null, notes: notes.trim() || null, attendance };
        try {
          if (session) await coursesApi.updateSession(session.id, body);
          else await coursesApi.createSession(levelId, body);
          onSaved();
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <Group grow align="flex-start">
          <TextInput
            type="date"
            label={t('sessions.date')}
            value={date}
            max={todayIso()}
            onChange={(e) => {
              setDate(e.currentTarget.value);
              if (!session) setMarks({});
            }}
            disabled={!canEdit}
            required
          />
        </Group>
        <TextInput
          label={t('sessions.topic')}
          value={topic}
          onChange={(e) => setTopic(e.currentTarget.value)}
          maxLength={200}
          disabled={!canEdit}
        />
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              {t('sessions.attendance', { present: presentCount, total: entries.length })}
            </Text>
            {canEdit && entries.length > 0 && (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() =>
                  setMarks(Object.fromEntries(entries.map((e) => [e.enrollmentId, !allPresent])))
                }
              >
                {allPresent ? t('sessions.noneAbsent') : t('sessions.allPresent')}
              </Button>
            )}
          </Group>
          {roster.isFetching && !session ? (
            <Loader size="sm" />
          ) : entries.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('sessions.emptyRoster')}
            </Text>
          ) : (
            <Card withBorder radius="md" p="sm">
              <Stack gap="xs">
                {entries.map((e) => (
                  <Checkbox
                    key={e.enrollmentId}
                    label={fullName(e.person)}
                    checked={isPresent(e)}
                    disabled={!canEdit}
                    onChange={(ev) => {
                      const checked = ev.currentTarget.checked;
                      setMarks((m) => ({ ...m, [e.enrollmentId]: checked }));
                    }}
                  />
                ))}
              </Stack>
            </Card>
          )}
        </Stack>
        <Textarea
          label={t('sessions.notes')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={1000}
          disabled={!canEdit}
        />
        <Group justify="space-between" wrap="nowrap">
          {session && canEdit ? (
            <ActionIcon
              variant="subtle"
              color="red"
              size="lg"
              aria-label={t('sessions.delete')}
              onClick={onDelete}
            >
              <IconTrash size={18} />
            </ActionIcon>
          ) : (
            <span />
          )}
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>
              {canEdit ? t('common:actions.cancel') : t('sessions.close')}
            </Button>
            {canEdit && (
              <Button type="submit" loading={busy} disabled={!date}>
                {t('common:actions.save')}
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </form>
  );
}

/** Pestaña "Clases" de un nivel: lista de clases con presentes y alta/edición con asistencia. */
export function SessionsPanel({ levelId, canEdit }: { levelId: number; canEdit: boolean }) {
  const { t } = useTranslation(['courses', 'common']);
  const queryClient = useQueryClient();
  // null = cerrado; 'new' = clase nueva; número = clase existente.
  const [open, setOpen] = useState<'new' | number | null>(null);
  const list = useQuery({
    queryKey: [...coursesKey, 'sessions', levelId],
    queryFn: () => coursesApi.sessions(levelId),
  });
  const detail = useQuery({
    queryKey: [...coursesKey, 'session', open],
    queryFn: () => coursesApi.session(open as number),
    enabled: typeof open === 'number',
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: coursesKey });

  const remove = (id: number) =>
    modals.openConfirmModal({
      title: t('sessions.deleteTitle'),
      children: <Text size="sm">{t('sessions.deleteBody')}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await coursesApi.removeSession(id);
          setOpen(null);
          notifications.show({ color: 'teal', message: t('sessions.deleted') });
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const items = list.data?.items ?? [];
  return (
    <Stack gap="md">
      {canEdit && (
        <Button
          leftSection={<IconPlus size={18} />}
          variant="light"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setOpen('new')}
        >
          {t('sessions.new')}
        </Button>
      )}
      <FormError error={list.error} />
      {list.isPending ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : items.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t('sessions.empty')}
        </Text>
      ) : (
        <Card withBorder radius="lg">
          <Stack gap="sm">
            {items.map((s, i) => (
              <Fragment key={s.id}>
                {i > 0 && <Divider />}
                <UnstyledButton onClick={() => setOpen(s.id)}>
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <div style={{ minWidth: 0 }}>
                      <Text fw={500}>{formatDate(s.date)}</Text>
                      {s.topic && (
                        <Text size="xs" c="dimmed" truncate>
                          {s.topic}
                        </Text>
                      )}
                    </div>
                    <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                      {t('sessions.presentOf', { present: s.present, total: s.total })}
                    </Text>
                  </Group>
                </UnstyledButton>
              </Fragment>
            ))}
          </Stack>
        </Card>
      )}
      <ResponsiveModal
        opened={open !== null}
        onClose={() => setOpen(null)}
        title={open === 'new' ? t('sessions.newTitle') : t('sessions.editTitle')}
      >
        {open === 'new' && (
          <SessionForm
            levelId={levelId}
            session={null}
            canEdit={canEdit}
            onClose={() => setOpen(null)}
            onSaved={async () => {
              setOpen(null);
              notifications.show({ color: 'teal', message: t('sessions.saved') });
              await refresh();
            }}
            onDelete={() => undefined}
          />
        )}
        {typeof open === 'number' &&
          (detail.data ? (
            <SessionForm
              key={detail.data.id}
              levelId={levelId}
              session={detail.data}
              canEdit={canEdit}
              onClose={() => setOpen(null)}
              onSaved={async () => {
                setOpen(null);
                notifications.show({ color: 'teal', message: t('sessions.saved') });
                await refresh();
              }}
              onDelete={() => remove(open)}
            />
          ) : detail.isError ? (
            <FormError error={detail.error} />
          ) : (
            <Loader />
          ))}
      </ResponsiveModal>
    </Stack>
  );
}
