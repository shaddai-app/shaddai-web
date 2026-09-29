import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Menu,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconBrandSpotify,
  IconBrandYoutube,
  IconDots,
  IconExternalLink,
  IconFileMusic,
  IconLink,
  IconPencil,
  IconPresentation,
  IconTextDecrease,
  IconTextIncrease,
  IconTrash,
  IconWaveSine,
  type Icon,
} from '@tabler/icons-react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { songsApi, type LinkType } from '../../../../../../api/worship';
import { requirePermission } from '../../../../../../auth/guards';
import { can } from '../../../../../../auth/permissions';
import { meQuery } from '../../../../../../auth/session';
import { FormError } from '../../../../../../components/FormError';
import { ButtonLink } from '../../../../../../components/links';
import { transposeKey } from '../../../../../../features/worship/chordpro';
import { KeyControl, SongSheet } from '../../../../../../features/worship/SongSheet';
import { useSheet } from '../../../../../../features/worship/useSheet';
import { SongFormModal } from '../../../../../../features/worship/SongFormModal';
import { errorMessage } from '../../../../../../i18n/errors';
import { PageHeader } from '../../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/alabanza/canciones/$id/')({
  validateSearch: z.object({ tono: z.coerce.number().int().min(-11).max(11).optional() }),
  beforeLoad: ({ context }) => requirePermission(context.me, 'alabanza.ver'),
  component: SongPage,
});

const LINK_ICONS: Record<LinkType, Icon> = {
  youtube: IconBrandYoutube,
  spotify: IconBrandSpotify,
  multitrack: IconWaveSine,
  sheet: IconFileMusic,
  other: IconLink,
};

function SongPage() {
  const { t } = useTranslation(['worship', 'common']);
  const id = Number(Route.useParams().id);
  const { tono = 0 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const query = useQuery({ queryKey: ['songs', 'detail', id], queryFn: () => songsApi.get(id) });
  const [editing, setEditing] = useState(false);
  const [showChords, setShowChords] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const song = query.data;
  const sheet = useSheet(song?.chordPro, song?.originalKey, tono);

  if (query.isPending) return <Loader />;
  if (query.isError) return <FormError error={query.error} />;
  const s = query.data;
  const canEdit = can(me, 'alabanza.canciones');
  const setTono = (d: number) =>
    void navigate({ search: { tono: ((d % 12) + 12) % 12 || undefined }, replace: true });
  const currentKey = s.originalKey ? transposeKey(s.originalKey, tono) : null;
  const remove = () =>
    modals.openConfirmModal({
      title: t('deleteTitle', { title: s.title }),
      children: <Text size="sm">{t('deleteBody')}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await songsApi.remove(s.id);
          void queryClient.invalidateQueries({ queryKey: ['songs'] });
          void navigate({ to: '/alabanza/canciones' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <>
      <PageHeader
        title={s.title}
        badge={
          !s.isActive && (
            <Badge color="gray" variant="light">
              {t('inactive')}
            </Badge>
          )
        }
        description={s.author ?? undefined}
        actions={
          <Group gap="xs">
            <ButtonLink
              to="/alabanza/canciones/$id/escenario"
              params={{ id: String(s.id) }}
              search={{ tono: tono || undefined }}
              leftSection={<IconPresentation size={18} />}
              variant={canEdit ? 'default' : 'filled'}
              disabled={!sheet}
            >
              {t('stage.open')}
            </ButtonLink>
            {canEdit && (
              <>
                <Button leftSection={<IconPencil size={18} />} onClick={() => setEditing(true)}>
                  {t('edit')}
                </Button>
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="default" size="lg" aria-label={t('common:actions.more')}>
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={remove}>
                      {t('delete')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </>
            )}
          </Group>
        }
      />
      <Grid gap="md" maw={1200}>
        <Grid.Col span={{ base: 12, md: 8 }} order={{ base: 2, md: 1 }}>
          <Card withBorder radius="lg">
            <Group justify="space-between" wrap="wrap" gap="sm" mb="md">
              <KeyControl originalKey={s.originalKey} delta={tono} onChange={setTono} />
              <Group gap="sm" wrap="nowrap">
                <Switch
                  label={t('chords')}
                  checked={showChords}
                  onChange={(e) => setShowChords(e.currentTarget.checked)}
                />
                <ActionIcon
                  variant="default"
                  onClick={() => setFontSize((f) => Math.max(12, f - 2))}
                  aria-label={t('fontSmaller')}
                >
                  <IconTextDecrease size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="default"
                  onClick={() => setFontSize((f) => Math.min(28, f + 2))}
                  aria-label={t('fontBigger')}
                >
                  <IconTextIncrease size={16} />
                </ActionIcon>
              </Group>
            </Group>
            {sheet ? (
              <SongSheet sheet={sheet} showChords={showChords} fontSize={fontSize} />
            ) : (
              <Text c="dimmed" size="sm">
                {s.chordPro ? t('parseError') : t('noChordPro')}
              </Text>
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 1, md: 2 }}>
          <Stack gap="md">
            {(s.originalKey || s.bpm || s.timeSignature || s.ccliNumber || s.tags.length > 0) && (
              <Card withBorder radius="lg">
                <Stack gap={6}>
                  {[
                    [
                      t('details.key'),
                      s.originalKey &&
                        (currentKey !== s.originalKey ? `${s.originalKey} → ${currentKey}` : s.originalKey),
                    ],
                    [t('details.bpm'), s.bpm],
                    [t('details.timeSignature'), s.timeSignature],
                  ].map(([label, value]) =>
                    value ? (
                      <Group key={String(label)} justify="space-between">
                        <Text size="sm" c="dimmed">
                          {label}
                        </Text>
                        <Text size="sm" fw={500}>
                          {value}
                        </Text>
                      </Group>
                    ) : null,
                  )}
                  {s.ccliNumber && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        CCLI
                      </Text>
                      <Anchor
                        size="sm"
                        href={`https://songselect.ccli.com/songs/${s.ccliNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.ccliNumber}
                      </Anchor>
                    </Group>
                  )}
                  {s.tags.length > 0 && (
                    <Group gap={4} mt={4}>
                      {s.tags.map((x) => (
                        <Badge key={x} variant="light" color="gray" tt="none">
                          {x}
                        </Badge>
                      ))}
                    </Group>
                  )}
                </Stack>
              </Card>
            )}
            {s.links.length > 0 && (
              <Card withBorder radius="lg">
                <Title order={3} size="h6" mb="xs">
                  {t('links')}
                </Title>
                <Stack gap={6}>
                  {s.links.map((l) => {
                    const LinkIcon = LINK_ICONS[l.type];
                    return (
                      <Anchor key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" size="sm">
                        <Group gap={6} wrap="nowrap">
                          <LinkIcon size={16} />
                          <Text size="sm" truncate>
                            {l.label || t(`linkTypes.${l.type}`)}
                          </Text>
                          <IconExternalLink size={12} />
                        </Group>
                      </Anchor>
                    );
                  })}
                </Stack>
              </Card>
            )}
            {s.notes && (
              <Card withBorder radius="lg">
                <Title order={3} size="h6" mb="xs">
                  {t('notes')}
                </Title>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {s.notes}
                </Text>
              </Card>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
      <SongFormModal
        opened={editing}
        song={s}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          queryClient.setQueryData(['songs', 'detail', id], saved);
          void queryClient.invalidateQueries({ queryKey: ['songs', 'list'] });
          notifications.show({ color: 'teal', message: t('common:saved') });
        }}
      />
    </>
  );
}
