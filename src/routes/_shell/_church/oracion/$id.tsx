import { Card, Center, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { prayerApi } from '../../../../api/prayer';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { PrayerItem } from '../../../../features/prayer/PrayerItem';
import { prayerContextQuery } from '../../../../features/prayer/queries';
import { ReplyThread } from '../../../../features/prayer/ReplyThread';
import { RequesterCard } from '../../../../features/prayer/RequesterCard';
import { RequesterLinks } from '../../../../features/prayer/RequesterLinks';
import { usePrayerActions } from '../../../../features/prayer/usePrayerActions';
import { BackButton } from '../../../../components/BackButton';

export const Route = createFileRoute('/_shell/_church/oracion/$id')({
  component: PrayerRequestPage,
});

// Detalle de una petición (los avisos del centro de notificaciones llevan acá): el texto, quién la
// pidió (las del formulario) y la conversación con el equipo.
function PrayerRequestPage() {
  const { t } = useTranslation('prayer');
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(meQuery());
  const queryClient = useQueryClient();
  const context = useQuery(prayerContextQuery());
  const request = useQuery({
    queryKey: ['prayer', 'detail', id],
    queryFn: () => prayerApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });
  const canReply = request.data?.canReply ?? false;
  const replies = useQuery({
    queryKey: ['prayer', 'replies', id],
    queryFn: () => prayerApi.replies(id),
    enabled: canReply,
  });
  const { handlers, modals } = usePrayerActions({ onDeleted: () => void navigate({ to: '/oracion' }) });
  const pastoral = context.data?.pastoral ?? false;

  const send = async (body: string) => {
    await prayerApi.reply(id, body);
    await queryClient.invalidateQueries({ queryKey: ['prayer'] });
  };

  return (
    <Stack gap="md">
      <BackButton to={{ to: '/oracion' }} />
      <FormError error={request.error} />
      {request.isPending && request.fetchStatus !== 'idle' ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : request.data ? (
        <SimpleGrid cols={{ base: 1, lg: 2 }} style={{ alignItems: 'start' }}>
          <Stack gap="md">
            <Card withBorder radius="lg">
              <PrayerItem p={request.data} full canModerate={pastoral} {...handlers(request.data)} />
            </Card>
            {request.data.requester && (
              <RequesterCard p={request.data} requester={request.data.requester} canMark={pastoral} />
            )}
            {pastoral && request.data.requester && (
              <RequesterLinks
                p={request.data}
                requester={request.data.requester}
                canCreatePerson={can(me, 'personas.crear')}
              />
            )}
          </Stack>
          {canReply && (
            <Card withBorder radius="lg">
              <Stack gap="sm">
                <div>
                  <Text fw={600}>{t('replies.title')}</Text>
                  <Text size="xs" c="dimmed">
                    {request.data.mine ? t('replies.hintMine') : t('replies.hint')}
                  </Text>
                </div>
                <FormError error={replies.error} />
                {replies.data ? (
                  <ReplyThread replies={replies.data} side="team" onSend={send} />
                ) : (
                  <Center py="md">
                    <Loader size="sm" />
                  </Center>
                )}
              </Stack>
            </Card>
          )}
        </SimpleGrid>
      ) : null}
      {modals}
    </Stack>
  );
}
