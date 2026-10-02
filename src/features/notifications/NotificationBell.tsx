import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Indicator,
  Loader,
  Popover,
  ScrollArea,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconBell, IconSettings } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '../../api/notifications';
import { ActionIconLink, AnchorLink } from '../../components/links';
import { NotificationItem } from './NotificationItem';

/** Campana del header: cantidad sin leer (se consulta cada minuto) y los últimos avisos. */
export function NotificationBell() {
  const { t } = useTranslation('notifications');
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const count = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
  });
  const latest = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => notificationsApi.list({ pageSize: 8 }),
    enabled: opened,
  });
  const unread = count.data?.count ?? 0;
  const markAll = async () => {
    await notificationsApi.markAllRead();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width={360}
      shadow="md"
      radius="lg"
      withinPortal
    >
      <Popover.Target>
        <Tooltip label={t('bell')} disabled={opened}>
          <Indicator
            label={unread > 99 ? '99+' : unread}
            size={16}
            disabled={unread === 0}
            offset={6}
            color="red"
          >
            <ActionIcon
              onClick={() => setOpened((o) => !o)}
              aria-label={unread ? `${t('bell')} (${t('unread', { count: unread })})` : t('bell')}
            >
              <IconBell size={20} stroke={1.6} />
            </ActionIcon>
          </Indicator>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p={0} maw="calc(100vw - 24px)">
        <Group justify="space-between" px="md" py="xs" wrap="nowrap">
          <Text fw={600}>{t('title')}</Text>
          <Group gap={4} wrap="nowrap">
            {unread > 0 && (
              <Button variant="subtle" size="compact-xs" onClick={() => void markAll()}>
                {t('markAllRead')}
              </Button>
            )}
            <ActionIconLink
              to="/configuracion/notificaciones"
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t('settings')}
              onClick={() => setOpened(false)}
            >
              <IconSettings size={16} />
            </ActionIconLink>
          </Group>
        </Group>
        <Divider />
        {latest.isPending ? (
          <Group justify="center" p="md">
            <Loader size="sm" />
          </Group>
        ) : !latest.data?.items.length ? (
          <Text size="sm" c="dimmed" p="md">
            {t('empty')}
          </Text>
        ) : (
          <ScrollArea.Autosize mah={420}>
            {latest.data.items.map((n) => (
              <NotificationItem key={n.id} n={n} onOpen={() => setOpened(false)} />
            ))}
          </ScrollArea.Autosize>
        )}
        <Divider />
        <Group justify="center" py={8}>
          <AnchorLink to="/notificaciones" size="sm" onClick={() => setOpened(false)}>
            {t('seeAll')}
          </AnchorLink>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
