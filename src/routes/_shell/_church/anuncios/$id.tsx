import { Card, Center, Loader, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { announcementsApi } from '../../../../api/announcements';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { AnchorLink } from '../../../../components/links';
import { AnnouncementFormModal } from '../../../../features/announcements/AnnouncementFormModal';
import { AnnouncementItem } from '../../../../features/announcements/AnnouncementItem';
import { useAudienceLabel } from '../../../../features/announcements/queries';
import { errorMessage } from '../../../../i18n/errors';

export const Route = createFileRoute('/_shell/_church/anuncios/$id')({
  component: AnnouncementPage,
});

// Detalle de un anuncio (el aviso del centro de notificaciones lleva acá).
function AnnouncementPage() {
  const { t } = useTranslation(['announcements', 'common']);
  const id = Number(Route.useParams().id);
  const { data: me } = useSuspenseQuery(meQuery());
  const manager = can(me, 'anuncios.gestionar');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const audienceLabel = useAudienceLabel(manager);
  const announcement = useQuery({
    queryKey: ['announcements', 'detail', id],
    queryFn: () => announcementsApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });

  const remove = () =>
    modals.openConfirmModal({
      title: t('deleteTitle'),
      children: <Text size="sm">{t('deleteBody', { title: announcement.data?.title })}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await announcementsApi.remove(id);
          notifications.show({ color: 'teal', message: t('deleted') });
          await queryClient.invalidateQueries({ queryKey: ['announcements'] });
          void navigate({ to: '/anuncios' });
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  return (
    <Stack gap="md" maw={820}>
      <AnchorLink to="/anuncios" size="sm">
        ← {t('backToList')}
      </AnchorLink>
      <FormError error={announcement.error} />
      {announcement.isPending && announcement.fetchStatus !== 'idle' ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : announcement.data ? (
        <Card withBorder radius="lg">
          <AnnouncementItem
            a={announcement.data}
            full
            audienceLabel={manager ? audienceLabel(announcement.data.audiences) : undefined}
            onEdit={manager ? () => setEditing(true) : undefined}
            onDelete={manager ? remove : undefined}
          />
        </Card>
      ) : null}
      <AnnouncementFormModal
        opened={editing}
        announcement={announcement.data ?? null}
        onClose={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          notifications.show({ color: 'teal', message: t('saved') });
          await queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }}
      />
    </Stack>
  );
}
