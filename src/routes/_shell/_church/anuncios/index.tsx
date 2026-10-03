import { Button, Card, Center, Divider, Loader, Stack, Tabs, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  announcementsApi,
  MANAGE_STATUSES,
  type Announcement,
  type ManageStatus,
} from '../../../../api/announcements';
import { can } from '../../../../auth/permissions';
import { meQuery } from '../../../../auth/session';
import { FormError } from '../../../../components/FormError';
import { PaginationBar } from '../../../../components/PaginationBar';
import { AnnouncementFormModal } from '../../../../features/announcements/AnnouncementFormModal';
import { AnnouncementItem } from '../../../../features/announcements/AnnouncementItem';
import { announcementsFeedQuery, useAudienceLabel } from '../../../../features/announcements/queries';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/anuncios/')({
  validateSearch: z.object({
    estado: z.enum(MANAGE_STATUSES).optional(),
    pagina: z.coerce.number().int().min(1).optional(),
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { t } = useTranslation(['announcements', 'common']);
  const { data: me } = useSuspenseQuery(meQuery());
  const manager = can(me, 'anuncios.gestionar');
  const { estado = 'current', pagina = 1 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const audienceLabel = useAudienceLabel(manager);

  const list = useQuery({
    ...(manager
      ? {
          queryKey: ['announcements', 'manage', estado, pagina],
          queryFn: () => announcementsApi.manage(estado, pagina),
        }
      : announcementsFeedQuery(pagina, 10)),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['announcements'] });

  const remove = (a: Announcement) =>
    modals.openConfirmModal({
      title: t('deleteTitle'),
      children: <Text size="sm">{t('deleteBody', { title: a.title })}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await announcementsApi.remove(a.id);
          notifications.show({ color: 'teal', message: t('deleted') });
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const items = list.data?.items ?? [];
  const content = list.isPending ? (
    <Center py="xl">
      <Loader />
    </Center>
  ) : items.length === 0 ? (
    <Text c="dimmed" ta="center" py="xl">
      {manager ? t(`empty.${estado}`) : t('empty.feed')}
    </Text>
  ) : (
    <Card withBorder radius="lg">
      <Stack gap="md">
        {items.map((a, i) => (
          <Fragment key={a.id}>
            {i > 0 && <Divider />}
            <AnnouncementItem
              a={a}
              audienceLabel={manager ? audienceLabel(a.audiences) : undefined}
              onEdit={
                manager
                  ? () => {
                      setEditing(a);
                      setFormOpen(true);
                    }
                  : undefined
              }
              onDelete={manager ? () => remove(a) : undefined}
            />
          </Fragment>
        ))}
      </Stack>
    </Card>
  );

  return (
    <Stack gap="lg" maw={820}>
      <PageHeader
        title={t('title')}
        description={manager ? t('descriptionManager') : t('description')}
        actions={
          manager && (
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('new')}
            </Button>
          )
        }
      />
      <FormError error={list.error} />
      {manager && (
        <Tabs
          value={estado}
          onChange={(v) =>
            void navigate({ search: { estado: (v ?? 'current') as ManageStatus }, replace: true })
          }
        >
          <Tabs.List>
            {MANAGE_STATUSES.map((s) => (
              <Tabs.Tab key={s} value={s}>
                {t(`status.${s}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}
      {content}
      {list.data && (
        <PaginationBar
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onChange={(p) => void navigate({ search: (s) => ({ ...s, pagina: p }) })}
        />
      )}
      <AnnouncementFormModal
        opened={formOpen}
        announcement={editing}
        onClose={() => setFormOpen(false)}
        onSaved={async (a) => {
          setFormOpen(false);
          notifications.show({ color: 'teal', message: editing ? t('saved') : t('published') });
          await refresh();
          // Uno nuevo programado se ve en "Programados".
          if (!editing && new Date(a.publishAt) > new Date()) {
            void navigate({ search: { estado: 'scheduled' }, replace: true });
          }
        }}
      />
    </Stack>
  );
}
