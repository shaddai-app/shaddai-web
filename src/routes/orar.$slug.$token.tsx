import {
  Alert,
  Badge,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCircleCheck, IconRotateClockwise, IconTrash } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publicPrayerApi, type PublicPrayerView } from '../api/prayer';
import { FormError } from '../components/FormError';
import { PublicShell } from '../components/PublicShell';
import { ReplyThread } from '../features/prayer/ReplyThread';
import { errorMessage } from '../i18n/errors';

// Enlace privado de quien pidió oración sin usuario: ve su petición y la conversación con la iglesia,
// contesta, la marca respondida o la retira. Quien tenga el enlace puede hacerlo (no hay login).
export const Route = createFileRoute('/orar/$slug/$token')({
  component: PrayerLinkPage,
});

const textStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;

function PrayerLinkPage() {
  const { slug, token } = Route.useParams();
  const { t } = useTranslation(['prayer', 'common']);
  const queryClient = useQueryClient();
  const key = ['public-prayer', slug, token];
  const view = useQuery({
    queryKey: key,
    queryFn: () => publicPrayerApi.view(slug, token),
    retry: false,
  });
  const [answering, setAnswering] = useState(false);
  const [testimony, setTestimony] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [withdrawn, setWithdrawn] = useState(false);

  if (view.isPending) {
    return (
      <Center mih="100dvh">
        <Loader />
      </Center>
    );
  }
  if (view.error || withdrawn) {
    return (
      <PublicShell>
        <Stack align="center" ta="center" gap="xs">
          <Title order={1} size="h4">
            {withdrawn ? t('link.withdrawnTitle') : t('link.notFoundTitle')}
          </Title>
          <Text c="dimmed" size="sm">
            {withdrawn ? t('link.withdrawnBody') : t('link.notFoundBody')}
          </Text>
        </Stack>
      </PublicShell>
    );
  }
  const { church, request: p } = view.data;
  const answered = p.status === 'answered';
  const save = (request: PublicPrayerView) =>
    queryClient.setQueryData(key, { church, request } satisfies typeof view.data);

  const update = async (status: 'open' | 'answered') => {
    setBusy(true);
    setError(null);
    try {
      save(
        await publicPrayerApi.update(slug, token, {
          status,
          ...(status === 'answered' ? { testimony: testimony.trim() || null } : {}),
        }),
      );
      setAnswering(false);
      notifications.show({
        color: 'teal',
        message: status === 'answered' ? t('answeredSaved') : t('reopened'),
      });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = () =>
    modals.openConfirmModal({
      title: t('link.withdrawTitle'),
      children: <Text size="sm">{t('link.withdrawBody')}</Text>,
      labels: { confirm: t('link.withdraw'), cancel: t('link.keep') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await publicPrayerApi.withdraw(slug, token);
          setWithdrawn(true);
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <PublicShell logo={church.logoUrl} name={church.name}>
      <Stack gap="md">
        <div>
          <Title order={1} size="h3">
            {p.name ? t('link.titleNamed', { name: p.name }) : t('link.title')}
          </Title>
          <Text size="xs" c="dimmed" mt={4}>
            {t('link.sentOn', { date: dayjs(p.createdAt).format('L') })}
          </Text>
        </div>
        <FormError error={error} />

        {(answered || p.onWall) && (
          <Group gap={6}>
            {answered && (
              <Badge size="sm" variant="light" color="teal">
                {t('answered')}
              </Badge>
            )}
            {p.onWall && (
              <Badge size="sm" variant="light" color="marfil">
                {t('link.onWall')}
              </Badge>
            )}
          </Group>
        )}
        <Text size="sm" style={textStyle}>
          {p.body}
        </Text>
        {answered && p.testimony && (
          <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-teal-light)">
            <Text size="xs" fw={600} c="teal" mb={4}>
              {t('testimony')}
            </Text>
            <Text size="sm" style={textStyle}>
              {p.testimony}
            </Text>
          </Paper>
        )}
        <Text size="sm" c="dimmed">
          {p.prayerCount > 0
            ? answered
              ? t('prayedCount', { count: p.prayerCount })
              : t('prayingCount', { count: p.prayerCount })
            : t('link.noPrayersYet')}
        </Text>
        {p.wantsContact && (
          <Alert color={p.contacted ? 'teal' : 'gray'} variant="light">
            {p.contacted ? t('link.contacted') : t('link.contactPending')}
          </Alert>
        )}

        <Divider />
        <div>
          <Text fw={600}>{t('replies.title')}</Text>
          <Text size="xs" c="dimmed">
            {t('link.repliesHint', { church: church.name })}
          </Text>
        </div>
        <ReplyThread
          replies={p.replies}
          side="requester"
          onSend={async (body) => save(await publicPrayerApi.reply(slug, token, body))}
        />

        <Divider />
        {answering ? (
          <Stack gap="xs">
            <Text size="sm">{t('answer.intro')}</Text>
            <Textarea
              label={t('answer.testimony')}
              autosize
              minRows={2}
              maxLength={1000}
              value={testimony}
              onChange={(e) => setTestimony(e.currentTarget.value)}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setAnswering(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button color="teal" loading={busy} onClick={() => void update('answered')}>
                {t('answer.confirm')}
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group gap="xs">
            {answered ? (
              <Button
                variant="light"
                leftSection={<IconRotateClockwise size={16} />}
                loading={busy}
                onClick={() => void update('open')}
              >
                {t('reopen')}
              </Button>
            ) : (
              <Button
                variant="light"
                color="teal"
                leftSection={<IconCircleCheck size={16} />}
                onClick={() => {
                  setTestimony(p.testimony ?? '');
                  setAnswering(true);
                }}
              >
                {t('link.markAnswered')}
              </Button>
            )}
            <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={withdraw}>
              {t('link.withdraw')}
            </Button>
          </Group>
        )}
        <Text size="xs" c="dimmed">
          {t('link.privacy')}
        </Text>
      </Stack>
    </PublicShell>
  );
}
