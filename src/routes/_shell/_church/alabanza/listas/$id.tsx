import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Menu,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDown,
  IconArrowUp,
  IconDots,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconPresentation,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setlistsApi, songsApi, type Setlist, type SetlistItemInput } from '../../../../../api/worship';
import { requirePermission } from '../../../../../auth/guards';
import { FormError } from '../../../../../components/FormError';
import { ActionIconLink, AnchorLink } from '../../../../../components/links';
import { STATUS_COLORS } from '../../../../../features/ministries/schedule';
import { moveItem } from '../../../../../features/ministries/common';
import { fullName } from '../../../../../features/people/format';
import { MAJOR_KEYS, MINOR_KEYS, semitonesBetween } from '../../../../../features/worship/chordpro';
import { errorMessage } from '../../../../../i18n/errors';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/alabanza/listas/$id')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'alabanza.ver'),
  component: SetlistPage,
});

const inputOf = (s: Setlist): SetlistItemInput[] =>
  s.items.map((i) => ({ songId: i.song.id, key: i.key, notes: i.notes }));

/** Edición del título y las notas de la lista. */
function EditForm({ s, onDone }: { s: Setlist; onDone: (saved?: Setlist) => void }) {
  const { t } = useTranslation(['worship', 'common']);
  const [title, setTitle] = useState(s.title ?? '');
  const [notes, setNotes] = useState(s.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          onDone(
            await setlistsApi.update(s.id, { title: title.trim() || null, notes: notes.trim() || null }),
          );
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <TextInput
          label={t('setlists.new.title')}
          placeholder={s.event?.title}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={150}
          required={!s.eventId}
          data-autofocus
        />
        <Textarea
          label={t('setlists.notes')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          maxLength={1000}
          autosize
          minRows={3}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => onDone()}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function SetlistPage() {
  const { t } = useTranslation(['worship', 'ministries', 'common']);
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const key = ['setlists', 'detail', id];
  const query = useQuery({ queryKey: key, queryFn: () => setlistsApi.get(id) });
  const songs = useQuery({
    queryKey: ['songs', 'list', 'all-active'],
    queryFn: () => songsApi.list({ pageSize: 200 }),
    enabled: query.data?.canEdit === true,
  });
  const [busy, setBusy] = useState(false);

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const s = query.data;
  const title = s.title ?? s.event?.title ?? t('setlists.untitled');

  const save = (saved: Setlist) => {
    queryClient.setQueryData(key, saved);
    void queryClient.invalidateQueries({ queryKey: ['setlists', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['songs', 'usage'] });
  };
  const run = async (action: () => Promise<Setlist>, message?: string) => {
    setBusy(true);
    try {
      save(await action());
      if (message) notifications.show({ color: 'teal', message });
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  const setItems = (items: SetlistItemInput[]) => run(() => setlistsApi.setItems(s.id, items));
  const current = inputOf(s);
  const edit = () => {
    const modalId = modals.open({
      title: t('setlists.edit'),
      children: (
        <EditForm
          s={s}
          onDone={(saved) => {
            modals.close(modalId);
            if (saved) save(saved);
          }}
        />
      ),
    });
  };
  const remove = () =>
    modals.openConfirmModal({
      title: t('setlists.deleteTitle', { title }),
      children: <Text size="sm">{t('setlists.deleteBody')}</Text>,
      labels: { confirm: t('setlists.delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await setlistsApi.remove(s.id);
          void queryClient.invalidateQueries({ queryKey: ['setlists'] });
          void navigate({ to: '/alabanza/listas' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });
  const available = (songs.data?.items ?? []).filter((x) => !current.some((c) => c.songId === x.id));

  return (
    <>
      <PageHeader
        back={{ to: '/alabanza/listas' }}
        title={title}
        description={`${dayjs(s.startsAt).format('dddd L · LT')}${s.event?.location ? ` · ${s.event.location}` : ''}`}
        badge={
          <Badge variant="light" color={s.cancelled ? 'red' : s.status === 'published' ? 'teal' : 'gray'}>
            {s.cancelled ? t('setlists.cancelled') : t(`setlists.status.${s.status}`)}
          </Badge>
        }
        actions={
          s.canEdit && (
            <Group gap="xs">
              <Button
                leftSection={s.status === 'published' ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                variant={s.status === 'published' ? 'default' : 'filled'}
                loading={busy}
                onClick={() =>
                  void run(
                    () =>
                      setlistsApi.update(s.id, { status: s.status === 'published' ? 'draft' : 'published' }),
                    s.status === 'published' ? t('setlists.unpublished') : t('setlists.published'),
                  )
                }
              >
                {s.status === 'published' ? t('setlists.unpublish') : t('setlists.publish')}
              </Button>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" aria-label={t('common:actions.more')}>
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconPencil size={16} />} onClick={edit}>
                    {t('setlists.edit')}
                  </Menu.Item>
                  <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={remove}>
                    {t('setlists.delete')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )
        }
      />
      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder radius="lg">
            <Title order={3} size="h5" mb="sm">
              {t('setlists.songs', { count: s.items.length })}
            </Title>
            {s.items.length === 0 && (
              <Text size="sm" c="dimmed" mb="sm">
                {t('setlists.noSongs')}
              </Text>
            )}
            <Stack gap={0}>
              {s.items.map((item, i) => {
                const songKey = item.key ?? item.song.originalKey;
                const tono =
                  item.song.originalKey && item.key ? semitonesBetween(item.song.originalKey, item.key) : 0;
                const minor = item.song.originalKey?.endsWith('m') ?? false;
                return (
                  <Group
                    key={item.id}
                    wrap="wrap"
                    gap="sm"
                    py="xs"
                    align="flex-start"
                    style={{ borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined }}
                  >
                    <Text fw={700} c="dimmed" w={20} ta="right" style={{ flexShrink: 0 }}>
                      {item.position}
                    </Text>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <AnchorLink
                          to="/alabanza/canciones/$id"
                          params={{ id: String(item.song.id) }}
                          search={{ tono: tono || undefined }}
                          fw={600}
                          truncate
                        >
                          {item.song.title}
                        </AnchorLink>
                        {item.song.deleted && (
                          <Badge size="xs" color="gray" variant="light">
                            {t('setlists.songDeleted')}
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {[item.song.author, item.song.bpm && `${item.song.bpm} bpm`, item.song.timeSignature]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      {s.canEdit ? (
                        <TextInput
                          size="xs"
                          mt={4}
                          variant="filled"
                          placeholder={t('setlists.itemNotes')}
                          aria-label={t('setlists.itemNotesOf', { title: item.song.title })}
                          defaultValue={item.notes ?? ''}
                          maxLength={300}
                          onBlur={(e) => {
                            const v = e.currentTarget.value.trim() || null;
                            if (v !== item.notes)
                              void setItems(current.map((c, j) => (j === i ? { ...c, notes: v } : c)));
                          }}
                        />
                      ) : (
                        item.notes && (
                          <Text size="sm" mt={2}>
                            {item.notes}
                          </Text>
                        )
                      )}
                    </div>
                    <Group gap={4} wrap="nowrap" ml="auto" style={{ flexShrink: 0 }}>
                      {s.canEdit ? (
                        <Select
                          size="xs"
                          w={78}
                          aria-label={t('setlists.keyOf', { title: item.song.title })}
                          data={minor ? MINOR_KEYS : MAJOR_KEYS}
                          value={songKey}
                          placeholder="—"
                          onChange={(v) =>
                            void setItems(current.map((c, j) => (j === i ? { ...c, key: v } : c)))
                          }
                          allowDeselect={false}
                          comboboxProps={{ withinPortal: true }}
                        />
                      ) : (
                        songKey && (
                          <Badge variant="light" tt="none" size="lg" radius="sm">
                            {songKey}
                          </Badge>
                        )
                      )}
                      <Tooltip label={t('stage.open')}>
                        <ActionIconLink
                          to="/alabanza/canciones/$id/escenario"
                          params={{ id: String(item.song.id) }}
                          search={{ tono: tono || undefined }}
                          variant="subtle"
                          aria-label={t('stage.openFor', { title: item.song.title })}
                        >
                          <IconPresentation size={16} />
                        </ActionIconLink>
                      </Tooltip>
                      {s.canEdit && (
                        <>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            disabled={i === 0 || busy}
                            onClick={() => void setItems(moveItem(current, i, -1))}
                            aria-label={t('setlists.up', { title: item.song.title })}
                          >
                            <IconArrowUp size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            disabled={i === s.items.length - 1 || busy}
                            onClick={() => void setItems(moveItem(current, i, 1))}
                            aria-label={t('setlists.down', { title: item.song.title })}
                          >
                            <IconArrowDown size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            disabled={busy}
                            onClick={() => void setItems(current.filter((_, j) => j !== i))}
                            aria-label={t('setlists.remove', { title: item.song.title })}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </>
                      )}
                    </Group>
                  </Group>
                );
              })}
            </Stack>
            {s.canEdit && (
              <Select
                mt="sm"
                placeholder={t('setlists.addSong')}
                aria-label={t('setlists.addSong')}
                data={available.map((x) => ({
                  value: String(x.id),
                  label: x.originalKey ? `${x.title} (${x.originalKey})` : x.title,
                }))}
                value={null}
                onChange={(v) => {
                  const song = available.find((x) => String(x.id) === v);
                  if (song)
                    void setItems([...current, { songId: song.id, key: song.originalKey, notes: null }]);
                }}
                searchable
                nothingFoundMessage={t('setlists.noMatches')}
                disabled={busy || songs.isPending}
                comboboxProps={{ withinPortal: true }}
              />
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            {s.eventId && (
              <Card withBorder radius="lg">
                <Title order={3} size="h5" mb="xs">
                  {t('setlists.musicians')}
                </Title>
                {s.musicians.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t('setlists.noMusicians')}
                  </Text>
                ) : (
                  <Stack gap={4}>
                    {s.musicians.map((m, i) => (
                      <Group key={i} justify="space-between" wrap="nowrap" gap="xs">
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" truncate td={m.status === 'declined' ? 'line-through' : undefined}>
                            {fullName(m.person)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {m.role}
                          </Text>
                        </div>
                        <Badge
                          size="xs"
                          variant="light"
                          color={STATUS_COLORS[m.status]}
                          style={{ flexShrink: 0 }}
                        >
                          {t(`ministries:schedule.status.${m.status}`)}
                        </Badge>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Card>
            )}
            {s.notes && (
              <Card withBorder radius="lg">
                <Title order={3} size="h5" mb="xs">
                  {t('setlists.notes')}
                </Title>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {s.notes}
                </Text>
              </Card>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
