import { Badge, Button, Card, Chip, Group, Loader, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { songsApi } from '../../../../../api/worship';
import { requirePermission } from '../../../../../auth/guards';
import { can } from '../../../../../auth/permissions';
import { meQuery } from '../../../../../auth/session';
import { FormError } from '../../../../../components/FormError';
import { UnstyledLink } from '../../../../../components/links';
import { SongFormModal } from '../../../../../features/worship/SongFormModal';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/alabanza/canciones/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'alabanza.ver'),
  component: SongsPage,
});

function SongsPage() {
  const { t } = useTranslation(['worship', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery());
  const [q, setQ] = useState('');
  const [debounced] = useDebouncedValue(q, 300);
  const [tag, setTag] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const query = useQuery({
    queryKey: ['songs', 'list', debounced, tag, includeInactive],
    queryFn: () =>
      songsApi.list({ q: debounced || undefined, tag: tag ?? undefined, includeInactive, pageSize: 200 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          can(me, 'alabanza.canciones') && (
            <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>
              {t('new')}
            </Button>
          )
        }
      />
      <Stack gap="md" maw={900}>
        <Group gap="sm" wrap="wrap">
          <TextInput
            style={{ flex: 1, minWidth: 220 }}
            leftSection={<IconSearch size={16} />}
            placeholder={t('search')}
            aria-label={t('search')}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
          />
          <Switch
            label={t('showInactive')}
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.currentTarget.checked)}
          />
        </Group>
        {query.data && query.data.tags.length > 0 && (
          <Chip.Group value={tag} onChange={(v) => setTag(v === tag ? null : (v as string))}>
            <Group gap={6}>
              {query.data.tags.map((x) => (
                <Chip key={x} value={x} size="xs" onClick={() => tag === x && setTag(null)}>
                  {x}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        )}
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : query.data.items.length === 0 ? (
          <Text c="dimmed">{debounced || tag ? t('noResults') : t('empty')}</Text>
        ) : (
          <Card withBorder radius="lg" p={0}>
            {query.data.items.map((s, i) => (
              <UnstyledLink
                key={s.id}
                to="/alabanza/canciones/$id"
                params={{ id: String(s.id) }}
                style={{
                  display: 'block',
                  padding: '10px 16px',
                  borderTop: i ? '1px solid var(--mantine-color-default-border)' : undefined,
                  opacity: s.isActive ? 1 : 0.6,
                }}
              >
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={500} truncate>
                      {s.title}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {[s.author, s.bpm && `${s.bpm} bpm`, s.timeSignature, ...s.tags]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </div>
                  <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                    {!s.isActive && (
                      <Badge size="xs" color="gray" variant="light">
                        {t('inactive')}
                      </Badge>
                    )}
                    {s.originalKey && (
                      <Badge variant="light" tt="none" size="lg" radius="sm">
                        {s.originalKey}
                      </Badge>
                    )}
                  </Group>
                </Group>
              </UnstyledLink>
            ))}
          </Card>
        )}
        {query.data && query.data.total > query.data.items.length && (
          <Text size="xs" c="dimmed">
            {t('showing', { shown: query.data.items.length, total: query.data.total })}
          </Text>
        )}
      </Stack>
      <SongFormModal
        opened={creating}
        song={null}
        onClose={() => setCreating(false)}
        onSaved={(s) => {
          setCreating(false);
          void queryClient.invalidateQueries({ queryKey: ['songs'] });
          notifications.show({ color: 'teal', message: t('created') });
          void navigate({ to: '/alabanza/canciones/$id', params: { id: String(s.id) } });
        }}
      />
    </>
  );
}
