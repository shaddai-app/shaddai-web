import { Button, Card, Divider, Group, Loader, Stack, Switch, Text } from '@mantine/core';
import { IconChecks, IconSettings } from '@tabler/icons-react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '../../../api/notifications';
import { FormError } from '../../../components/FormError';
import { ButtonLink } from '../../../components/links';
import { NotificationItem } from '../../../features/notifications/NotificationItem';
import { PageHeader } from '../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/notificaciones')({ component: NotificationsPage });

const PAGE_SIZE = 20;

function NotificationsPage() {
  const { t } = useTranslation('notifications');
  const queryClient = useQueryClient();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ['notifications', 'page', onlyUnread],
    queryFn: ({ pageParam }) =>
      notificationsApi.list({ unread: onlyUnread, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = query.data?.pages[0]?.unread ?? 0;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<IconChecks size={18} />}
              disabled={unread === 0}
              onClick={async () => {
                await notificationsApi.markAllRead();
                void queryClient.invalidateQueries({ queryKey: ['notifications'] });
              }}
            >
              {t('markAllRead')}
            </Button>
            <ButtonLink
              to="/configuracion/notificaciones"
              variant="subtle"
              leftSection={<IconSettings size={18} />}
            >
              {t('settings')}
            </ButtonLink>
          </Group>
        }
      />
      <Stack gap="md">
        <Switch
          label={t('onlyUnread')}
          checked={onlyUnread}
          onChange={(e) => setOnlyUnread(e.currentTarget.checked)}
        />
        {query.isPending ? (
          <Loader />
        ) : query.isError ? (
          <FormError error={query.error} />
        ) : items.length === 0 ? (
          <Text c="dimmed">{onlyUnread ? t('emptyUnread') : t('empty')}</Text>
        ) : (
          <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
            {items.map((n, i) => (
              <Fragment key={n.id}>
                {i > 0 && <Divider />}
                <NotificationItem n={n} />
              </Fragment>
            ))}
          </Card>
        )}
        {query.hasNextPage && (
          <Button
            variant="default"
            onClick={() => void query.fetchNextPage()}
            loading={query.isFetchingNextPage}
            style={{ alignSelf: 'center' }}
          >
            {t('loadMore')}
          </Button>
        )}
      </Stack>
    </>
  );
}
