import { Badge, Button, Card, Group, Loader, SegmentedControl, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setlistsApi } from '../../../../../api/worship';
import { requirePermission } from '../../../../../auth/guards';
import { FormError } from '../../../../../components/FormError';
import { UnstyledLink } from '../../../../../components/links';
import { addDays } from '../../../../../features/calendar/dates';
import { todayIso } from '../../../../../features/people/format';
import { NewSetlistModal } from '../../../../../features/worship/NewSetlistModal';
import { PageHeader } from '../../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/alabanza/listas/')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'alabanza.ver'),
  component: SetlistsPage,
});

type Range = 'upcoming' | 'past';

function SetlistsPage() {
  const { t } = useTranslation(['worship', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<Range>('upcoming');
  const [creating, setCreating] = useState(false);
  const today = todayIso();
  const [from, to] =
    range === 'upcoming' ? [today, addDays(today, 120)] : [addDays(today, -365), addDays(today, -1)];
  const query = useQuery({
    queryKey: ['setlists', 'list', from, to],
    queryFn: () => setlistsApi.list(from, to),
    placeholderData: keepPreviousData,
  });
  const items = range === 'past' ? [...(query.data?.items ?? [])].reverse() : (query.data?.items ?? []);
  const open = (id: number) => void navigate({ to: '/alabanza/listas/$id', params: { id: String(id) } });

  return (
    <>
      <PageHeader
        title={t('setlists.title')}
        description={t('setlists.description')}
        actions={
          query.data?.canEdit && (
            <Button leftSection={<IconPlus size={18} />} onClick={() => setCreating(true)}>
              {t('setlists.new.heading')}
            </Button>
          )
        }
      />
      <Stack gap="md" maw={820}>
        <SegmentedControl
          value={range}
          onChange={(v) => setRange(v as Range)}
          data={[
            { value: 'upcoming', label: t('setlists.upcoming') },
            { value: 'past', label: t('setlists.past') },
          ]}
          style={{ alignSelf: 'flex-start' }}
        />
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : items.length === 0 ? (
          <Text c="dimmed">
            {range === 'upcoming' ? t('setlists.emptyUpcoming') : t('setlists.emptyPast')}
          </Text>
        ) : (
          items.map((s) => (
            <UnstyledLink key={s.id} to="/alabanza/listas/$id" params={{ id: String(s.id) }}>
              <Card withBorder radius="lg">
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Text size="xs" c="dimmed" tt="capitalize">
                      {dayjs(s.startsAt).format('dddd L · LT')}
                    </Text>
                    <Text fw={600} truncate td={s.cancelled ? 'line-through' : undefined}>
                      {s.title ?? t('setlists.untitled')}
                    </Text>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {s.songs.length ? s.songs.join(' · ') : t('setlists.noSongs')}
                    </Text>
                  </div>
                  <Badge
                    variant="light"
                    color={s.cancelled ? 'red' : s.status === 'published' ? 'teal' : 'gray'}
                    style={{ flexShrink: 0 }}
                  >
                    {s.cancelled ? t('setlists.cancelled') : t(`setlists.status.${s.status}`)}
                  </Badge>
                </Group>
              </Card>
            </UnstyledLink>
          ))
        )}
      </Stack>
      <NewSetlistModal
        opened={creating}
        onClose={() => setCreating(false)}
        onCreated={(s) => {
          setCreating(false);
          void queryClient.invalidateQueries({ queryKey: ['setlists'] });
          notifications.show({ color: 'teal', message: t('setlists.created') });
          open(s.id);
        }}
        onExisting={(id) => {
          setCreating(false);
          notifications.show({ color: 'blue', message: t('setlists.existing') });
          open(id);
        }}
      />
    </>
  );
}
